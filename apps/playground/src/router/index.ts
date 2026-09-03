import { createRouter, createWebHashHistory } from 'vue-router';

import EditorView from '../views/EditorView.vue';
import DocumentationView from '../views/DocumentationView.vue';
import { docPages } from '../docs/registry';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/editor' },
    { path: '/editor', component: EditorView },
    { path: '/docs', redirect: '/docs/getting-started' },
    { path: '/docs/:slug', component: DocumentationView },
    { path: '/:pathMatch(.*)*', redirect: '/editor' },
  ],
});

router.beforeEach((to) => {
  if (
    typeof to.params.slug === 'string' &&
    to.path.startsWith('/docs/') &&
    !docPages.some((page) => page.slug === to.params.slug)
  ) {
    return '/docs/getting-started';
  }
  return true;
});

router.afterEach(() => window.scrollTo({ top: 0, behavior: 'instant' }));
