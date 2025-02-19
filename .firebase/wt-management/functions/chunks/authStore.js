import { e as current_component } from "./index.js";
import { w as writable } from "./exports.js";
import { a as auth } from "./firebase.js";
function onDestroy(fn) {
  var context = (
    /** @type {Component} */
    current_component
  );
  (context.d ??= []).push(fn);
}
const user = writable(null);
auth.onAuthStateChanged((currentUser) => {
  user.set(currentUser);
});
export {
  onDestroy as o,
  user as u
};
