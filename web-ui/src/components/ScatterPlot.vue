<template>
  <div class="scatter-plot">
    <div ref="plotContainer" class="plot-container"></div>
  </div>
</template>

<script setup>
import Plotly from 'plotly.js-dist-min';
import { nextTick, onMounted, ref, watch } from 'vue';

const props = defineProps({
  points: {
    type: Array,
    required: true
  },
  colorBy: {
    type: String,
    default: 'category' // 'category', 'piiRisk', 'date'
  },
  selectedPoints: {
    type: Array,
    default: () => []
  },
  height: {
    type: Number,
    default: 600
  }
});

const emit = defineEmits(['point-click', 'selection-change']);

const plotContainer = ref(null);

// Color schemes
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

const piiRiskColors = {
  'none': '#2ECC71',
  'low': '#F39C12',
  'medium': '#E67E22',
  'high': '#E74C3C',
  'critical': '#8E44AD'
};

function getColorByAttribute(point, attribute) {
  if (attribute === 'category') {
    return categoryColors[point.category] || categoryColors['Unknown'];
  } else if (attribute === 'piiRisk') {
    return piiRiskColors[point.piiRisk] || piiRiskColors['none'];
  } else if (attribute === 'date') {
    // Gradient based on date (newer = blue, older = red)
    if (!point.date) return '#95A5A6';
    const timestamp = new Date(point.date).getTime();
    const now = Date.now();
    const daysSince = (now - timestamp) / (1000 * 60 * 60 * 24);
    const hue = Math.max(0, Math.min(240, 240 - (daysSince * 2))); // 240=blue, 0=red
    return `hsl(${hue}, 70%, 50%)`;
  }
  return '#3498DB';
}

function createPlot() {
  if (!plotContainer.value || props.points.length === 0) return;

  // Group points by attribute for separate traces
  const groups = {};
  props.points.forEach(point => {
    const key = props.colorBy === 'category' ? point.category :
                props.colorBy === 'piiRisk' ? point.piiRisk :
                'all';
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(point);
  });

  // Create traces for each group
  const traces = Object.entries(groups).map(([groupName, groupPoints]) => {
    const color = props.colorBy === 'category' ? categoryColors[groupName] :
                  props.colorBy === 'piiRisk' ? piiRiskColors[groupName] :
                  '#3498DB';

    return {
      x: groupPoints.map(p => p.x),
      y: groupPoints.map(p => p.y),
      mode: 'markers',
      type: 'scatter',
      name: groupName,
      text: groupPoints.map(p => p.title),
      customdata: groupPoints.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        location: p.location,
        tags: p.tags,
        piiRisk: p.piiRisk,
        snippet: p.snippet
      })),
      marker: {
        size: 8,
        color: color,
        opacity: 0.7,
        line: {
          width: 1,
          color: 'white'
        }
      },
      hovertemplate: 
        '<b>%{customdata.title}</b><br>' +
        'Category: %{customdata.category}<br>' +
        'Location: %{customdata.location}<br>' +
        'PII Risk: %{customdata.piiRisk}<br>' +
        '<extra></extra>'
    };
  });

  const layout = {
    title: {
      text: 'Document Cluster Visualization',
      font: { size: 18 }
    },
    xaxis: {
      title: 'UMAP Dimension 1',
      showgrid: true,
      zeroline: false
    },
    yaxis: {
      title: 'UMAP Dimension 2',
      showgrid: true,
      zeroline: false
    },
    hovermode: 'closest',
    height: props.height,
    showlegend: true,
    legend: {
      orientation: 'v',
      x: 1.02,
      y: 1,
      bgcolor: 'rgba(255, 255, 255, 0.8)',
      bordercolor: '#ddd',
      borderwidth: 1
    },
    dragmode: 'select', // Enable box selection by default
    selectdirection: 'any'
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToAdd: ['lasso2d', 'select2d'],
    displaylogo: false
  };

  Plotly.newPlot(plotContainer.value, traces, layout, config);

  // Handle click events
  plotContainer.value.on('plotly_click', (data) => {
    if (data.points && data.points.length > 0) {
      const point = data.points[0];
      emit('point-click', point.customdata);
    }
  });

  // Handle selection events (lasso/box select)
  plotContainer.value.on('plotly_selected', (data) => {
    if (data && data.points) {
      const selected = data.points.map(p => p.customdata);
      // Emit both selected points and the selection geometry
      const selectionGeometry = {
        type: data.lassoPoints ? 'lasso' : 'box',
        range: data.range,  // For box: {x: [x0, x1], y: [y0, y1]}
        lassoPoints: data.lassoPoints  // For lasso: {x: [...], y: [...]}
      };
      emit('selection-change', selected, selectionGeometry);
    }
  });

  // Handle deselect
  plotContainer.value.on('plotly_deselect', () => {
    emit('selection-change', []);
  });
}

onMounted(() => {
  nextTick(() => {
    createPlot();
  });
});

watch(() => [props.points, props.colorBy], () => {
  nextTick(() => {
    createPlot();
  });
}, { deep: true });

// Handle window resize
onMounted(() => {
  const handleResize = () => {
    if (plotContainer.value) {
      Plotly.Plots.resize(plotContainer.value);
    }
  };
  window.addEventListener('resize', handleResize);
  
  // Cleanup
  return () => {
    window.removeEventListener('resize', handleResize);
  };
});

// Expose method to clear selection
const clearSelection = () => {
  if (plotContainer.value) {
    // Clear any selection shapes from the layout
    Plotly.relayout(plotContainer.value, {
      'selections': []
    });
    
    // Clear selectedpoints for all traces
    if (plotContainer.value.data) {
      const numTraces = plotContainer.value.data.length;
      const update = {};
      for (let i = 0; i < numTraces; i++) {
        update[`selectedpoints[${i}]`] = null;
      }
      Plotly.restyle(plotContainer.value, update);
    }
    
    // Trigger deselect event
    plotContainer.value.emit('plotly_deselect');
  }
};

// Expose method to apply selection from geometry
const applySelection = async (geometry, retries = 3) => {
  if (!plotContainer.value || !geometry) return;
  
  // Wait for plot to be fully initialized
  await nextTick();
  
  // Check if plot has data
  if (!plotContainer.value.data || !plotContainer.value.data[0]) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return applySelection(geometry, retries - 1);
    }
    console.warn('Plot not ready for selection after multiple retries');
    return;
  }
  
  try {
    if (geometry.type === 'box' && geometry.range) {
      // Select points within the box first
      const selectedIndices = [];
      plotContainer.value.data[0].x.forEach((x, idx) => {
        const y = plotContainer.value.data[0].y[idx];
        if (x >= geometry.range.x[0] && x <= geometry.range.x[1] &&
            y >= geometry.range.y[0] && y <= geometry.range.y[1]) {
          selectedIndices.push(idx);
        }
      });
      
      if (selectedIndices.length > 0) {
        // Apply both the selected points and the selection box using Plotly's native selection
        await Plotly.restyle(plotContainer.value, { 
          selectedpoints: [selectedIndices],
          'marker.opacity': [selectedIndices.map((_, i) => i === selectedIndices.indexOf(i) ? 1 : 0.3)]
        }, [0]);
        
        // Use Plotly's native selection visualization
        await Plotly.relayout(plotContainer.value, {
          'xaxis.range': [
            Math.min(geometry.range.x[0], ...plotContainer.value.data[0].x),
            Math.max(geometry.range.x[1], ...plotContainer.value.data[0].x)
          ],
          'yaxis.range': [
            Math.min(geometry.range.y[0], ...plotContainer.value.data[0].y),
            Math.max(geometry.range.y[1], ...plotContainer.value.data[0].y)
          ],
          'selections': [{
            type: 'rect',
            xref: 'x',
            yref: 'y',
            x0: geometry.range.x[0],
            y0: geometry.range.y[0],
            x1: geometry.range.x[1],
            y1: geometry.range.y[1]
          }]
        });
        
        // Emit selection change with the selected points
        const selected = selectedIndices.map(idx => plotContainer.value.data[0].customdata[idx]);
        
        // Trigger the plotly_selected event with proper format including geometry
        const eventData = {
          points: selected.map(data => ({ customdata: data })),
          range: geometry.range  // Include the selection range for the event listener
        };
        plotContainer.value.emit('plotly_selected', eventData);
      }
    } else if (geometry.type === 'lasso' && geometry.lassoPoints) {
      // For lasso, we'd need to use a point-in-polygon algorithm
      // Not yet implemented
    }
  } catch (error) {
    console.error('Error applying selection:', error);
  }
};

defineExpose({
  clearSelection,
  applySelection
});
</script>

<style scoped>
.scatter-plot {
  width: 100%;
  height: 100%;
}

.plot-container {
  width: 100%;
  height: 100%;
}
</style>
