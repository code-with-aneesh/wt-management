import { d as slot, c as pop, p as push } from "../../chunks/index.js";
import { u as user, o as onDestroy } from "../../chunks/authStore.js";
import "../../chunks/firebase.js";
import "../../chunks/client.js";
import { e as escape_html } from "../../chunks/escaping.js";
import { a as attr } from "../../chunks/attributes.js";
function _layout($$payload, $$props) {
  push();
  let currentUser = null;
  const unsubscribe = user.subscribe((u) => {
    if (u) {
      currentUser = {
        displayName: u.displayName || "Anonymous",
        photoURL: u.photoURL || "default-profile.png"
      };
    } else {
      currentUser = null;
    }
  });
  onDestroy(() => {
    unsubscribe();
  });
  $$payload.out += `<nav class="bg-gray-800 p-4"><div class="container mx-auto flex justify-between items-center"><div class="text-white text-lg font-bold"><a href="/">MyApp</a></div> `;
  if (currentUser) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="space-x-4 flex items-center"><a href="/" class="text-gray-300 hover:text-white">Home</a> <a href="/dashboard" class="text-gray-300 hover:text-white">Dashboard</a> <a href="/about" class="text-gray-300 hover:text-white">About</a> <span class="text-gray-300">${escape_html(currentUser.displayName)}</span> <img${attr("src", currentUser.photoURL)}${attr("alt", currentUser.displayName)} class="inline-block w-8 h-8 rounded-full ml-2"> <button type="button" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800" aria-label="Logout">Logout</button></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div></nav> <main class="container mx-auto mt-4"><!---->`;
  slot($$payload, $$props, "default", {});
  $$payload.out += `<!----></main>`;
  pop();
}
export {
  _layout as default
};
