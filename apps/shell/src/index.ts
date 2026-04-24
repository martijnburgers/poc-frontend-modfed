// The async import boundary is required by Module Federation: it gives the
// runtime a chance to resolve the shared scope (React, React-DOM, ...) before
// any application code touches those modules.
import('./bootstrap');

export {};
