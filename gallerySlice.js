import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for uploading artwork to S3
export const uploadArtworkInS3Bucket = createAsyncThunk(
  'gallery/uploadArtworkInS3Bucket',
  async (fileData, { rejectWithValue }) => {
    try {
      // Replace with your actual S3 upload logic
      const formData = new FormData();
      formData.append('file', fileData.file);
      formData.append('metadata', JSON.stringify(fileData.metadata || {}));

      const response = await fetch('/api/upload-artwork', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  galleryFiles: [],
  uploadedFile: null,
  isUploading: false,
  uploadError: null,
  uploadProgress: 0,
};

const gallerySlice = createSlice({
  name: 'gallery',
  initialState,
  reducers: {
    clearUploadedFile: (state) => {
      state.uploadedFile = null;
    },
    clearUploadError: (state) => {
      state.uploadError = null;
    },
    removeFileFromGallery: (state, action) => {
      state.galleryFiles = state.galleryFiles.filter(
        file => file.id !== action.payload
      );
    },
    updateUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadArtworkInS3Bucket.pending, (state) => {
        state.isUploading = true;
        state.uploadError = null;
        state.uploadProgress = 0;
      })
      .addCase(uploadArtworkInS3Bucket.fulfilled, (state, { payload }) => {
        // Enhanced version of your original code with better error handling
        if (!payload) {
          console.warn('Upload completed but no payload received');
          state.isUploading = false;
          return;
        }

        if (!payload.status) {
          console.warn('Upload completed but status indicates failure:', payload);
          state.isUploading = false;
          state.uploadError = payload.message || 'Upload failed';
          return;
        }

        // Ensure payload.data exists before using it
        if (!payload.data) {
          console.warn('Upload completed but no data in payload');
          state.isUploading = false;
          state.uploadError = 'No file data received';
          return;
        }

        state.uploadedFile = payload.data;
        
        // Check if file already exists in gallery to avoid duplicates
        const existingFileIndex = state.galleryFiles.findIndex(
          file => file.id === payload.data.id || file.url === payload.data.url
        );
        
        if (existingFileIndex === -1) {
          state.galleryFiles.push(payload.data);
        } else {
          // Update existing file if it already exists
          state.galleryFiles[existingFileIndex] = payload.data;
        }
        
        state.isUploading = false;
        state.uploadProgress = 100;
        state.uploadError = null;
      })
      .addCase(uploadArtworkInS3Bucket.rejected, (state, action) => {
        state.isUploading = false;
        state.uploadError = action.payload || action.error.message || 'Upload failed';
        state.uploadProgress = 0;
      });
  },
});

export const { 
  clearUploadedFile, 
  clearUploadError, 
  removeFileFromGallery, 
  updateUploadProgress 
} = gallerySlice.actions;

export default gallerySlice.reducer;

// Selectors
export const selectGalleryFiles = (state) => state.gallery.galleryFiles;
export const selectUploadedFile = (state) => state.gallery.uploadedFile;
export const selectIsUploading = (state) => state.gallery.isUploading;
export const selectUploadError = (state) => state.gallery.uploadError;
export const selectUploadProgress = (state) => state.gallery.uploadProgress;