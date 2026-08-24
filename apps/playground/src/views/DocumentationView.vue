<script setup lang="ts">
import {computed} from 'vue';
import {useRoute} from 'vue-router';
import {MarkdownRenderer} from 'hexagon-editor/renderer';
import {docGroups, docPages, findDocPage} from '../docs/registry';

const route = useRoute();
const page = computed(() => findDocPage(typeof route.params.slug === 'string' ? route.params.slug : undefined));
</script>

<template>
  <main class="docs-layout">
    <aside class="docs-sidebar" aria-label="Documentation navigation">
      <p class="docs-sidebar__eyebrow">Documentation</p>
      <nav v-for="group in docGroups" :key="group" class="docs-nav-group" :aria-label="group">
        <h2>{{ group }}</h2>
        <RouterLink v-for="item in docPages.filter((entry) => entry.group === group)" :key="item.slug" :to="`/docs/${item.slug}`" :aria-current="item.slug === page.slug ? 'page' : undefined">{{ item.title }}</RouterLink>
      </nav>
    </aside>
    <div class="docs-content-wrap">
      <nav class="docs-mobile-nav" aria-label="Documentation pages">
        <RouterLink v-for="item in docPages" :key="item.slug" :to="`/docs/${item.slug}`" :aria-current="item.slug === page.slug ? 'page' : undefined">{{ item.title }}</RouterLink>
      </nav>
      <article class="docs-article">
        <header class="docs-article__header"><p>{{ page.group }}</p><h1>{{ page.title }}</h1><span>{{ page.description }}</span></header>
        <MarkdownRenderer :content="page.content" />
      </article>
    </div>
  </main>
</template>
