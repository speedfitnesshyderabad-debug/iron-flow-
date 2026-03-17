import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { supabase } from '../src/lib/supabase';
import { useAppContext } from '../AppContext';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (url: string) => void;
  title?: string;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  title = 'Upload Profile Picture'
}) => {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { currentUser } = useAppContext();
  const canUpload = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER'].includes(currentUser?.role || '');

  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  // Start camera stream
  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access back camera. Please allow camera permissions.");
      setIsCameraOpen(false);
    }
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get data URL and set as imgSrc for cropping
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImgSrc(dataUrl);
        setCrop(undefined); // Reset crop to force new crop init

        stopCamera();
      }
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setCrop(undefined);
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerAspectCrop(width, height, 1);
    setCrop(crop);
  }, []);

  const getCroppedImg = async (
    image: HTMLImageElement,
    crop: PixelCrop
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  };

  const handleUpload = async () => {
    if (!imgRef.current || !completedCrop) {
      alert('Please select and crop an image first');
      return;
    }

    if (!window.confirm("Are you sure you want to save this profile picture?")) {
      return;
    }

    setIsUploading(true);
    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      const fileName = `avatar-${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      onUpload(publicUrl);
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-[slideUp_0.3s_ease-out]">
        <h3 className="text-xl font-bold mb-4 tracking-tight uppercase">{title}</h3>

        {!imgSrc ? (
          <div className="space-y-4">
            <div className={`grid grid-cols-1 ${canUpload ? 'md:grid-cols-2' : ''} gap-4`}>
              {canUpload && (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 h-40"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-cloud-upload-alt text-xl text-blue-600"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700">Upload Photo</p>
                    <p className="text-[10px] text-gray-400">Select from device</p>
                  </div>
                </div>
              )}

              {canUpload && (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 h-40"
                  onClick={startCamera}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-camera text-xl text-blue-600"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700">Take Photo</p>
                    <p className="text-[10px] text-gray-400">Use camera</p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onSelectFile}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-64 overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imgSrc}
                  onLoad={onImageLoad}
                  className="max-w-full"
                />
              </ReactCrop>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Drag to adjust. The image will be cropped to a square.
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          {imgSrc && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !completedCrop}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Uploading...
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i>
                  Upload
                </>
              )}
            </button>
          )}
        </div>
      </div>
      {/* Camera Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            <div className="absolute top-4 right-4 z-10">
              <button
                type="button"
                onClick={stopCamera}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-end pb-10">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all active:scale-95 shadow-lg shadow-black/50"
              >
                <div className="w-16 h-16 bg-white rounded-full"></div>
              </button>
            </div>
          </div>
          <p className="text-white/50 text-xs mt-6 font-medium uppercase tracking-widest">Make sure your face is clearly visible</p>
        </div>
      )}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ImageUploadModal;
