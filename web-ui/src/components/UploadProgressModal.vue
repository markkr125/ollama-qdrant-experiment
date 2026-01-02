<template>
  <div v-if="show" class="modal-overlay" @click.self="handleOverlayClick">
    <div class="modal-dialog">
      <div class="modal-header">
        <h2>Upload Progress</h2>
        <div class="header-actions">
          <button v-if="canStop" @click="confirmStop" class="stop-btn" title="Stop upload">
            ⏸️ Stop
          </button>
          <button @click="handleClose" class="close-btn" title="Close">
            ×
          </button>
        </div>
      </div>
      
      <div class="modal-body">
        <!-- Overall Progress -->
        <div class="progress-summary">
          <div class="progress-stats">
            <span class="stat">{{ processedFiles }}/{{ totalFiles }} files processed</span>
            <span v-if="successfulFiles > 0" class="stat success">✅ {{ successfulFiles }} successful</span>
            <span v-if="failedFiles > 0" class="stat failed">❌ {{ failedFiles }} failed</span>
          </div>
          
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: progressPercent + '%' }"
              :class="{ 'stopped': jobStatus === 'stopped' }"
            ></div>
          </div>
          
          <div class="progress-percent">{{ progressPercent }}%</div>
        </div>

        <!-- Status Message -->
        <div v-if="statusMessage" class="status-message" :class="jobStatus">
          {{ statusMessage }}
        </div>

        <!-- File List -->
        <div class="files-list">
          <div 
            v-for="(file, index) in files" 
            :key="index"
            class="file-item"
            :class="file.status"
          >
            <span class="file-icon">{{ getFileIcon(file.status) }}</span>
            <span class="file-name">{{ file.name }}</span>
            <span v-if="file.error" class="file-error" :title="file.error">{{ truncateError(file.error) }}</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button 
          @click="handleClose" 
          class="btn btn-secondary"
        >
          Close
        </button>
        <button 
          v-if="canStop"
          @click="confirmStop" 
          class="btn btn-warning"
        >
          Stop Upload
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { getUploadJobStatus } from '../api';

export default {
  name: 'UploadProgressModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    jobId: {
      type: String,
      required: true
    }
  },
  emits: ['close', 'stop'],
  setup(props, { emit }) {
    const jobData = ref(null);
    let pollInterval = null;

    const jobStatus = computed(() => jobData.value?.status || 'processing');
    const totalFiles = computed(() => jobData.value?.totalFiles || 0);
    const processedFiles = computed(() => jobData.value?.processedFiles || 0);
    const successfulFiles = computed(() => jobData.value?.successfulFiles || 0);
    const failedFiles = computed(() => jobData.value?.failedFiles || 0);
    const files = computed(() => jobData.value?.files || []);
    
    const progressPercent = computed(() => {
      if (totalFiles.value === 0) return 0;
      return Math.round((processedFiles.value / totalFiles.value) * 100);
    });

    const isComplete = computed(() => {
      return jobStatus.value === 'completed' || jobStatus.value === 'stopped';
    });

    const canStop = computed(() => {
      return jobStatus.value === 'processing';
    });

    const statusMessage = computed(() => {
      if (jobStatus.value === 'completed') {
        if (failedFiles.value === 0) {
          return `✅ All ${totalFiles.value} files uploaded successfully!`;
        } else {
          return `⚠️ Upload completed with ${failedFiles.value} error(s)`;
        }
      } else if (jobStatus.value === 'stopped') {
        return `⏸️ Upload stopped. ${successfulFiles.value} files uploaded before stopping.`;
      } else if (jobData.value?.currentFile) {
        return `Processing: ${jobData.value.currentFile}`;
      }
      return 'Processing...';
    });

    function getFileIcon(status) {
      switch (status) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'processing': return '⏳';
        case 'pending': return '⏱️';
        default: return '⏱️';
      }
    }

    function truncateError(error) {
      if (!error) return '';
      if (error.length <= 60) return error;
      return error.substring(0, 60) + '...';
    }

    async function pollJobStatus() {
      if (!props.jobId) return;
      
      try {
        const data = await getUploadJobStatus(props.jobId);
        jobData.value = data;
        
        // Stop polling when complete
        if (data.status === 'completed' || data.status === 'stopped') {
          stopPolling();
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }

    function startPolling() {
      // Stop any existing polling first
      stopPolling();
      
      // Poll immediately
      pollJobStatus();
      // Then poll every second
      pollInterval = setInterval(pollJobStatus, 1000);
    }

    function stopPolling() {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }

    function handleClose() {
      emit('close');
    }

    function handleOverlayClick() {
      // Only allow closing if upload is complete
      if (isComplete.value) {
        handleClose();
      }
    }

    function confirmStop() {
      if (confirm('Are you sure you want to stop the upload? The current file will complete, but remaining files will be skipped.')) {
        emit('stop', props.jobId);
      }
    }

    onMounted(() => {
      if (props.show && props.jobId) {
        startPolling();
      }
    });

    onUnmounted(() => {
      stopPolling();
    });

    // Watch for prop changes - start/stop polling based on show state
    watch(() => props.show, (newShow) => {
      if (newShow && props.jobId) {
        startPolling();
      } else {
        stopPolling();
      }
    });

    // Watch for jobId changes
    watch(() => props.jobId, (newJobId, oldJobId) => {
      if (newJobId !== oldJobId) {
        stopPolling();
        if (props.show && newJobId) {
          startPolling();
        }
      }
    });

    return {
      jobStatus,
      totalFiles,
      processedFiles,
      successfulFiles,
      failedFiles,
      files,
      progressPercent,
      isComplete,
      canStop,
      statusMessage,
      getFileIcon,
      truncateError,
      handleClose,
      handleOverlayClick,
      confirmStop
    };
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.modal-dialog {
  background: var(--surface, #ffffff);
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
  border: 1px solid var(--border-color, #e5e7eb);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary, #111827);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.stop-btn {
  padding: 0.5rem 1rem;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.stop-btn:hover {
  background: #f57c00;
  transform: translateY(-1px);
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--text-secondary, #6b7280);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--background, #f9fafb);
  color: var(--text-primary, #111827);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.progress-summary {
  margin-bottom: 1.5rem;
}

.progress-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.stat {
  font-size: 0.9rem;
  color: var(--text-secondary, #6b7280);
}

.stat.success {
  color: #10b981;
  font-weight: 500;
}

.stat.failed {
  color: var(--error, #ef4444);
  font-weight: 500;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--background, #f3f4f6);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color, #4f46e5), #6366f1);
  background-size: 200% 100%;
  transition: width 0.3s ease;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  animation: shimmer 2s infinite linear;
}

.progress-fill::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255, 255, 255, 0.1) 10px,
    rgba(255, 255, 255, 0.1) 20px
  );
  animation: progress-stripes 1s linear infinite;
}

@keyframes progress-stripes {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 40px 0;
  }
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.progress-fill.stopped {
  background: linear-gradient(90deg, #ff9800, #f57c00);
  background-size: 200% 100%;
  animation: shimmer 2s infinite linear;
}

.progress-percent {
  text-align: right;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #111827);
}

.status-message {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  font-weight: 500;
  background: var(--background, #f9fafb);
  border-left: 4px solid var(--primary-color, #4f46e5);
  color: var(--text-primary, #111827);
}

.status-message.completed {
  background: #f0fdf4;
  border-left-color: #10b981;
  color: #059669;
}

.status-message.stopped {
  background: #fff7ed;
  border-left-color: #ff9800;
  color: #ea580c;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--background, #f9fafb);
  border-radius: 6px;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.file-item.success {
  border-left-color: #10b981;
  background: #f0fdf4;
}

.file-item.error {
  border-left-color: var(--error, #ef4444);
  background: #fef2f2;
}

.file-item.processing {
  border-left-color: var(--primary-color, #4f46e5);
  background: #eef2ff;
}

.file-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  color: var(--text-primary, #111827);
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  unicode-bidi: plaintext;
  direction: ltr;
  text-align: left;
}

.file-error {
  color: var(--error, #ef4444);
  font-size: 0.85rem;
  font-style: italic;
  flex-shrink: 0;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color, #4f46e5);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover, #4338ca);
  transform: translateY(-1px);
}

.btn-warning {
  background: #ff9800;
  color: white;
}

.btn-warning:hover {
  background: #f57c00;
  transform: translateY(-1px);
}
</style>
