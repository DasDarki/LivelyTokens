import {MODULE_ID, socket} from "./consts.ts";
import {Data, type LivelyTokenData, type LivelyTokenImage} from "./data.ts";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class LivelyTokensApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "lively-tokens-control",
    classes: ["lively-tokens", "themed", "theme-dark"],
    tag: "form",
    form: {
      handler: LivelyTokensApplication.prototype._onFormSubmit as any,
      submitOnChange: false,
      closeOnSubmit: false,
    },
    window: { title: "Lively Tokens" },
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/main.hbs` },
  };

  private _payload: LivelyTokenData;

  constructor(private readonly actor: any) {
    super();
    this._payload = Data.load(this.actor) ?? {};
    this._payload.images ??= [];
    if (!Array.isArray(this._payload.images)) {
      this._payload.images = [];
    }
  }

  async _prepareContext() {
    this._payload ??= {};
    this._payload.images ??= [];
    if (!Array.isArray(this._payload.images)) {
      this._payload.images = [];
    }

    return {
      canEdit: game.user?.isGM,
      name: this.actor.name,
      payload: this._payload,
    } as any;
  }

  protected _attachPartListeners(partId: string, html: HTMLElement): void {
    super._attachPartListeners(partId, html, {});
    if (partId !== "form") return;

    html.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", (ev) => this._onActionClick(ev));
    });
  }

  private async _onActionClick(event: Event) {
    const btn = event.currentTarget as HTMLButtonElement | null;
    if (!btn) return;

    const action = btn.dataset.action ?? "";
    const index = btn.dataset.index != null ? Number(btn.dataset.index) : undefined;

    const canEdit = !!game.user?.isGM;
    if (!canEdit && action !== "select-image") return;

    switch (action) {
      case "add-image":
        return this._addImage();
      case "remove-image":
        if (index == null || Number.isNaN(index)) return;
        return this._removeImage(index);
      case "pick-file":
        if (index == null || Number.isNaN(index)) return;
        return this._pickFile(index);
      case "select-image":
        if (index == null || Number.isNaN(index)) return;
        return this._selectImage(index);
      default:
        return;
    }
  }

  private async _addImage() {
    this._payload.images ??= [];
    if (!Array.isArray(this._payload.images)) {
      this._payload.images = [];
    }

    const img: LivelyTokenImage = { name: "", src: "", size: { x: 1, y: 1 } };
    this._payload.images.push(img);
    await this.render({ force: true });
  }

  private async _removeImage(index: number) {
    this._payload.images ??= [];
    if (!Array.isArray(this._payload.images)) {
      this._payload.images = [];
    }
    if (index < 0 || index >= this._payload.images.length) return;
    this._payload.images.splice(index, 1);
    await this.render({ force: true });
  }

  private async _pickFile(index: number) {
    this._payload.images ??= [];
    if (!Array.isArray(this._payload.images)) {
      this._payload.images = [];
    }
    const img = this._payload.images[index];
    if (!img) return;

    const fp = new FilePicker({
      type: "image",
      current: img.src || "",
      callback: async (path: string) => {
        img.src = path;
        await this.render({ force: true });
      },
    });

    fp.render({force: true});
  }

  private async _selectImage(index: number) {
    const img = this._payload.images?.[index];
    if (!img) return;

    if (!game.user?.isGM) {
      socket.executeAsGM("selectImage", {
        actorId: this.actor.id,
        img,
      });
    } else {
      LivelyTokensApplication.setActorImage(this.actor.id, img);
    }
  }

  protected async _onFormSubmit(event: SubmitEvent, form: HTMLFormElement, formData: any) {
    event?.preventDefault?.();

    const raw = formData?.object ?? formData ?? {};

    if (!this._payload) {
      this._payload = {};
    }
    if (!this._payload.images) {
      this._payload.images = [];
    }
    if (!Array.isArray(this._payload.images)) {
      this._payload.images = [];
    }

    this._payload.randomize = raw['payload.randomize'] === true;
    for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
      const name = raw[`payload.images.${i}.name`];
      const src = raw[`payload.images.${i}.src`];
      const sizeX = raw[`payload.images.${i}.size.x`];
      const sizeY = raw[`payload.images.${i}.size.y`];
      if (name == null || src == null) {
        break;
      }

      this._payload.images[i] = {
        name: String(name),
        src: String(src),
        size: {
          x: sizeX != null ? Number(sizeX) : undefined,
          y: sizeY != null ? Number(sizeY) : undefined,
        },
      };
    }

    await Data.save(this.actor, this._payload);
    ui.notifications?.info("Lively Tokens saved");
    await this.render({ force: true });
  }

  public static setActorImage(actorId: string, img: LivelyTokenImage): void {
    const actor = game.actors?.get(actorId);
    if (!actor) {
      console.warn(`[LivelyTokens] Could not find actor for ID: ${actorId}`);
      return;
    }

    const update: any = {
      "texture.src": img.src,
    };
    if (img.size?.x != null) {
      update["width"] = img.size.x;
    }
    if (img.size?.y != null) {
      update["height"] = img.size.y;
    }

    canvas?.tokens?.placeables.forEach(tok => {
      if (tok.document.actorId === actorId) {
        tok.document.update(update);
      }
    });

    actor.token?.update(update);
    actor.prototypeToken?.update(update);
    actor.update({ img: img.src });
  }
}
