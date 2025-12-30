<template>
  <div class="document-cluster-view">
    <!-- Header with controls -->
    <div class="cluster-header">
      <h1>📊 Document Clusters</h1>
      <div class="controls">
        <div class="control-group">
          <label>Color by:</label>
          <select v-model="colorBy" class="control-select">
            <option value="category">Category</option>
            <option value="piiRisk">PII Risk</option>
            <option value="date">Upload Date</option>
          </select>
        </div>

        <div class="control-group">
          <label>Max docs:</label>
          <input 
            v-model.number="maxDocs" 
            type="number" 
            min="100" 
            max="50000" 
            step="100"
            class="control-input"
            @change="handleLimitChange"
          />
        </div>

        <button @click="refreshVisualization" :disabled="loading" class="btn btn-refresh">
          <span v-if="!loading">🔄 Refresh</span>
          <span v-else>⏳ Refreshing...</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !visualizationData" class="loading-container">
      <div class="spinner"></div>
      <p>Generating visualization with UMAP...</p>
      <p class="loading-hint">This may take 5-10 seconds for large collections</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-container">
      <p class="error-message">❌ {{ error }}</p>
      <button @click="loadVisualization" class="btn btn-retry">Retry</button>
    </div>

    <!-- Visualization -->
    <div v-if="visualizationData && !loading" class="visualization-container">
      <!-- Info Bar -->
      <div class="info-bar">
        <div class="info-item">
          <strong>{{ visualizationData.metadata.visualizedDocuments }}</strong> documents
        </div>
        <div class="info-item" v-if="visualizationData.fromCache">
          ✅ Cached ({{ formatCacheAge(visualizationData.cacheAge) }} ago)
        </div>
        <div class="info-item" v-else>
          🆕 Generated in {{ visualizationData.generationTime }}ms
        </div>
        <div class="info-item" v-if="selectedPoints.length > 0">
          {{ selectedPoints.length }} selected
        </div>
      </div>

      <!-- Scatter Plot -->
      <div class="plot-wrapper">
        <ScatterPlot
          :points="visualizationData.points"
          :colorBy="colorBy"
          :selectedPoints="selectedPoints"
          :height="600"
          @point-click="handlePointClick"
          @selection-change="handleSelectionChange"
        />
      </div>

      <!-- Selection Panel (when points are selected) -->
      <div v-if="selectedPoints.length > 0" class="selection-panel">
        <div class="selection-header">
          <h3>Selected Documents ({{ selectedPoints.length }})</h3>
          <button @click="clearSelection" class="btn btn-small">Clear</button>
        </div>
        <div class="selected-list">
          <div
            v-for="point in selectedPoints.slice(0, 10)"
            :key="point.id"
            class="selected-item"
            @click="viewDocument(point.id)"
          >
            <div class="selected-title">{{ point.title }}</div>
            <div class="selected-meta">
              <span class="badge" :style="{ backgroundColor: getCategoryColor(point.category) }">
                {{ point.category }}
              </span>
              <span v-if="point.location" class="badge badge-location">{{ point.location }}</span>
              <span class="badge badge-pii" :class="`risk-${point.piiRisk}`">
                {{ point.piiRisk }}
              </span>
            </div>
          </div>
          <div v-if="selectedPoints.length > 10" class="selected-more">
            + {{ selectedPoints.length - 10 }} more
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div v-if="visualizationData && !loading" class="legend-box">
      <h4>💡 How to use:</h4>
      <ul>
        <li><strong>Click</strong> a point to view document details</li>
        <li><strong>Drag</strong> to select multiple documents (lasso tool)</li>
        <li><strong>Hover</strong> over points to see document info</li>
        <li><strong>Zoom</strong> with scroll wheel or pinch gesture</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import ScatterPlot from './ScatterPlot.vue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const emit = defineEmits(['view-document']);

const loading = ref(false);
const error = ref(null);
const visualizationData = ref(null);
const colorBy = ref('category');
const selectedPoints = ref([]);
const maxDocs = ref(5000); // Default limit

const categoryColors = {
  'Restaurant': '#FF6B6B',
  'Hotel': '#4ECDC4',
  'Technology': '#45B7D1',
  'Shopping': '#FFA07A',
  'Attraction': '#98D8C8',
  'Cafe': '#FFD93D',
  'Coworking': '#6C5CE7',
  'Gym': '#A8E6CF',
  'Hospital': '#FF8B94',
  'Museum': '#C7CEEA',
  'University': '#FFEAA7',
  'Unknown': '#95A5A6'
};

async function loadVisualization(forceRefresh = false) {
  loading.value = true;
  error.value = null;

  try {
    const url = `${API_URL}/api/visualize/scatter?refresh=${forceRefresh}&limit=${maxDocs.value}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load visualization: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      visualizationData.value = result.data;
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (err) {
    console.error('Visualization error:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function refreshVisualization() {
  await loadVisualization(true);
}

function handleLimitChange() {
  // Reload visualization with new limit
  loadVisualization(true);
}

function handlePointClick(point) {
  console.log('Point clicked:', point);
  // Navigate to document detail view
  if (point.id) {
    viewDocument(point.id);
  }
}

function handleSelectionChange(points) {
  selectedPoints.value = points;
  console.log(`Selected ${points.length} documents`);
}

function clearSelection() {
  selectedPoints.value = [];
}

function viewDocument(id) {
  // Emit event to parent to switch view and load document
  emit('view-document', id);
}

function getCategoryColor(category) {
  return categoryColors[category] || categoryColors['Unknown'];
}

function formatCacheAge(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

onMounted(() => {
  loadVisualization();
});
</script>

<style scoped>
.document-cluster-view {
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
}

.cluster-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #eee;
}

.cluster-header h1 {
  margin: 0;
  font-size: 2rem;
  color: #2c3e50;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-group label {
  font-weight: 500;
  color: #555;
}

.control-select {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
}

.control-input {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  width: 100px;
  text-align: center;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh {
  background: #3498db;
  color: white;
}

.btn-refresh:hover:not(:disabled) {
  background: #2980b9;
}

.btn-refresh:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.btn-retry {
  background: #e74c3c;
  color: white;
}

.btn-retry:hover {
  background: #c0392b;
}

.btn-small {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  background: #95a5a6;
  color: white;
}

.btn-small:hover {
  background: #7f8c8d;
}

.loading-container,
.error-container {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-hint {
  color: #7f8c8d;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.error-message {
  color: #e74c3c;
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.visualization-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-bar {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 0.9rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #555;
}

.plot-wrapper {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.selection-panel {
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.selection-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
}

.selected-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.selected-item {
  padding: 0.75rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.selected-item:hover {
  border-color: #3498db;
  box-shadow: 0 2px 4px rgba(52, 152, 219, 0.2);
}

.selected-title {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.selected-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge {
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
}

.badge-location {
  background: #95a5a6;
}

.badge-pii {
  font-weight: 600;
}

.badge-pii.risk-none {
  background: #2ecc71;
}

.badge-pii.risk-low {
  background: #f39c12;
}

.badge-pii.risk-medium {
  background: #e67e22;
}

.badge-pii.risk-high {
  background: #e74c3c;
}

.badge-pii.risk-critical {
  background: #8e44ad;
}

.selected-more {
  padding: 0.5rem;
  text-align: center;
  color: #7f8c8d;
  font-style: italic;
}

.legend-box {
  background: #e8f4f8;
  border: 1px solid #3498db;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1.5rem;
}

.legend-box h4 {
  margin: 0 0 0.75rem 0;
  color: #2c3e50;
  font-size: 1rem;
}

.legend-box ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #555;
}

.legend-box li {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}
</style>
