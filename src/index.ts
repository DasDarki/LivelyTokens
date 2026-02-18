import {MODULE_ID, setSocket} from "./consts.ts";
import {LivelyTokensApplication} from "./app.ts";
import {Data, type LivelyTokenImage} from "./data.ts";

// @ts-ignore
Hooks.once("socketlib.ready", () => {
  // @ts-ignore
  const socket = socketlib.registerModule(MODULE_ID);
  socket.register("selectImage", (data: any) => {
    if (game.user?.isGM) {
      LivelyTokensApplication.setActorImage(data.actorId, data.img);
    }
  });

  setSocket(socket);
});

Hooks.once("init", () => {
  console.log("Initializing module: " + MODULE_ID);

  foundry.applications.handlebars.loadTemplates([
    `modules/${MODULE_ID}/templates/main.hbs`,
  ]);

  game?.socket?.on(`module.${MODULE_ID}.selectImage`, (data: { actorId: string; img: LivelyTokenImage }) => {
    if (game.user?.isGM) {
      LivelyTokensApplication.setActorImage(data.actorId, data.img);
    }
  });
});

Hooks.on("renderActorSheetV2", (_, element, context, options) => {
  const header = element.querySelector(".window-header");
  if (!header) {
    console.warn("[Lively Tokens] Could not find header element for actor sheet.");
    return;
  }

  if (header.querySelector("button[data-lively-tokens]")) {
    return;
  }

  const docId = context.document.id;
  const newButtonHTML = `<button type="button" class="header-control icon fa-solid fa-circle-user" data-lively-tokens="true" data-actor="${docId}" data-tooltip="Lively Token" aria-label="Lively Token"></button>`;

  const button = header.querySelector("button");
  if (button) {
    button.insertAdjacentHTML("beforebegin", newButtonHTML);
  } else {
    header.insertAdjacentHTML("beforeend", newButtonHTML);
  }
});

window.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (!target.matches(".header-control.icon.fa-solid.fa-circle-user")) {
    return;
  }

  const actorId = target.getAttribute("data-actor");
  if (!actorId) {
    console.warn("[Lively Tokens] Could not find actor ID on button.");
    return;
  }


  const actor = game.actors?.get(actorId);
  if (!actor) {
    console.warn("[Lively Tokens] Could not find actor for ID:", actorId);
    return;
  }

  console.log("[Lively Tokens] Opening Lively Tokens for actor:", actor.name);
  const ui = new LivelyTokensApplication(actor);
  ui.render({ force: true });
});

Hooks.on("createToken", (token, options, userId) => {
  if (game.userId !== userId) {
    console.log("[Lively Tokens] Ignoring token creation by another user.");
    return;
  }

  if (!game.user?.isGM) {
    console.log("[Lively Tokens] Ignoring token creation by non-GM user.");
    return;
  }

  const actor = token.actor;
  if (!actor) {
    console.warn("[Lively Tokens] Created token has no actor.");
    return;
  }

  const payload = Data.load(actor);
  if (!payload.randomize || !payload.images || payload.images.length === 0) {
    console.log("[Lively Tokens] No randomization configured for actor:", actor.name);
    return;
  }

  const randomIndex = Math.floor(Math.random() * payload.images.length);
  const img = payload.images[randomIndex];
  if (!img) {
    console.warn("[Lively Tokens] Could not find image at random index for actor:", actor.name);
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

  token.update(update);
  token.actor?.token?.update(update);
  // @ts-ignore
  token?.document?.update(update);
});