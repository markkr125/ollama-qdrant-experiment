<template>
  <div class="facets-sidebar card">
    <h3 class="facets-title">Browse by</h3>
    
    <!-- Categories -->
    <div class="facet-group">
      <button 
        @click="categoryExpanded = !categoryExpanded"
        class="facet-header"
      >
        <span>📂 Categories</span>
        <span>{{ categoryExpanded ? '▼' : '▶' }}</span>
      </button>
      <div v-if="categoryExpanded" class="facet-list">
        <button
          v-for="cat in facets.categories"
          :key="cat.name"
          @click="$emit('filter-category', cat.name)"
          class="facet-item"
        >
          <span class="facet-name">{{ cat.name }}</span>
          <span class="facet-count">{{ cat.count }}</span>
        </button>
      </div>
    </div>

    <!-- Locations -->
    <div class="facet-group">
      <button 
        @click="locationExpanded = !locationExpanded"
        class="facet-header"
      >
        <span>📍 Locations</span>
        <span>{{ locationExpanded ? '▼' : '▶' }}</span>
      </button>
      <div v-if="locationExpanded" class="facet-list">
        <button
          v-for="loc in facets.locations"
          :key="loc.name"
          @click="$emit('filter-location', loc.name)"
          class="facet-item"
        >
          <span class="facet-name">{{ loc.name }}</span>
          <span class="facet-count">{{ loc.count }}</span>
        </button>
      </div>
    </div>

    <!-- Tags -->
    <div class="facet-group">
      <button 
        @click="tagsExpanded = !tagsExpanded"
        class="facet-header"
      >
        <span>🏷️ Tags</span>
        <span>{{ tagsExpanded ? '▼' : '▶' }}</span>
      </button>
      <div v-if="tagsExpanded" class="facet-list">
        <button
          v-for="tag in facets.tags"
          :key="tag.name"
          @click="$emit('filter-tag', tag.name)"
          class="facet-item"
        >
          <span class="facet-name">{{ tag.name }}</span>
          <span class="facet-count">{{ tag.count }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../api'

const emit = defineEmits(['filter-category', 'filter-location', 'filter-tag'])

const facets = ref({
  categories: [],
  locations: [],
  tags: []
})

const categoryExpanded = ref(true)
const locationExpanded = ref(false)
const tagsExpanded = ref(false)

onMounted(async () => {
  try {
    const response = await api.get('/facets')
    facets.value = response.data
  } catch (error) {
    console.error('Failed to load facets:', error)
  }
})
</script>

<style scoped>
.facets-sidebar {
  margin-top: 1.5rem;
}

.facets-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.facet-group {
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
}

.facet-group:last-child {
  border-bottom: none;
}

.facet-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-primary);
  transition: background 0.2s;
  border-radius: 6px;
}

.facet-header:hover {
  background: var(--background);
}

.facet-list {
  margin-top: 0.5rem;
}

.facet-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  border-radius: 6px;
}

.facet-item:hover {
  background: var(--background);
  color: var(--primary-color);
}

.facet-name {
  flex: 1;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.facet-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--background);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  min-width: 2rem;
  text-align: center;
}

.facet-item:hover .facet-count {
  background: var(--primary-color);
  color: white;
}
</style>
