/**
 * Sprite Atlas Helper
 * Specializes in parsing and drawing atlas files, supporting rotation and direction correction.
 */

class SpriteAtlasHelper {
    constructor() {
        // Debug mode
        this.debug = false;
    }
    
    /**
     * Parse the contents of the Atlas file
     * @param {string} atlasText - The text content of the Atlas file
     * @returns {Object} Parsed Atlas data
     */
    parseAtlas(atlasText) {
        const lines = atlasText.split('\n');
        const frames = {};
        const images = []; // Store information about all image files
        
        let currentPngFile = null;
        let currentImageIndex = -1;
        let currentImageWidth = 0;
        let currentImageHeight = 0;
        let currentFrameName = null;
        
        // Parse all lines
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line === '') continue;
            
            // Check if it's a new image section
            if (line.endsWith('.png') && !line.includes(':')) {
                // Save the new PNG file name
                currentPngFile = line;
                currentImageIndex = images.length;
                
                // Save new image information
                images.push({
                    file: currentPngFile,
                    size: { width: 0, height: 0 }
                });
                
                this.log(`[SpriteAtlasHelper] Found new image: ${currentPngFile}`);
                continue;
            }
            
            // Parse size line
            if (line.startsWith('size:') && currentImageIndex >= 0) {
                const sizeMatch = line.match(/size:(\d+),(\d+)/);
                if (sizeMatch) {
                    currentImageWidth = parseInt(sizeMatch[1]);
                    currentImageHeight = parseInt(sizeMatch[2]);
                    
                    // Update current image size information
                    images[currentImageIndex].size.width = currentImageWidth;
                    images[currentImageIndex].size.height = currentImageHeight;
                    
                    this.log(`[SpriteAtlasHelper] Image size: ${currentImageWidth}x${currentImageHeight}`);
                }
                continue;
            }
            
            // Skip other non-frame data header lines
            if (i < 4 && currentImageIndex === 0) continue;
            
            // Check if the line is a frame name
            if (!line.includes(':')) {
                currentFrameName = line;
                // Create new frame data and record which image it belongs to
                frames[currentFrameName] = {
                    imageIndex: currentImageIndex
                };
            } else if (currentFrameName && frames[currentFrameName]) {
                // Parse frame properties
                const [property, value] = line.split(':');
                
                if (property === 'bounds') {
                    // Parse bounds: x, y, width, height
                    const bounds = value.split(',').map(val => parseInt(val));
                    frames[currentFrameName].x = bounds[0];
                    frames[currentFrameName].y = bounds[1];
                    frames[currentFrameName].width = bounds[2];
                    frames[currentFrameName].height = bounds[3];
                } else if (property === 'offsets') {
                    // Parse offsets (if needed)
                    const offsets = value.split(',').map(val => parseInt(val));
                    frames[currentFrameName].offsetX = offsets[0];
                    frames[currentFrameName].offsetY = offsets[1];
                    frames[currentFrameName].originalWidth = offsets[2];
                    frames[currentFrameName].originalHeight = offsets[3];
                } else if (property === 'rotate') {
                    // Handle rotation information
                    frames[currentFrameName].rotate = value === '90';
                } else if (property === 'origin') {
                    // Parse origin
                    const origin = value.split(',').map(val => parseInt(val));
                    frames[currentFrameName].originX = origin[0];
                    frames[currentFrameName].originY = origin[1];
                }
            }
        }
        
        return {
            meta: {
                images: images,
                size: { w: currentImageWidth, h: currentImageHeight }
            },
            frames: frames
        };
    }
    
    /**
     * Find frame name by frame index
     * @param {Object} atlasData - Parsed Atlas data
     * @param {string} namePattern - Frame name pattern (e.g., "skeleton-left_")
     * @param {number} frameIndex - Frame index
     * @param {number} paddingZeros - Number of zeros to pad
     * @returns {string} Complete frame name
     */
    getFrameName(atlasData, namePattern, frameIndex, paddingZeros = 2) {
        // Format frame index (e.g., 00, 01, 02...)
        const paddedIndex = frameIndex.toString().padStart(paddingZeros, '0');
        return `${namePattern}${paddedIndex}`;
    }
    
    /**
     * Get frame data
     * @param {Object} atlasData - Parsed Atlas data
     * @param {string} frameName - Frame name
     * @returns {Object|null} Frame data or null
     */
    getFrameData(atlasData, frameName) {
        if (!atlasData || !atlasData.frames || !atlasData.frames[frameName]) {
            if (this.debug) console.error(`[SpriteAtlasHelper] Frame data not found: ${frameName}`);
            return null;
        }
        return atlasData.frames[frameName];
    }
    
    /**
     * Draw sprite frame onto the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {HTMLImageElement|Object} spriteSheet - Sprite sheet image or image collection
     * @param {Object} frameData - Frame data
     * @param {Object} options - Drawing options
     */
    drawFrame(ctx, canvas, spriteSheet, frameData, options = {}) {
        if (!ctx || !canvas || !frameData) {
            if (this.debug) console.error('[SpriteAtlasHelper] Incomplete parameters for drawing frame');
            return;
        }
        
        // Get frame name and index (only in debug mode)
        let frameName = '';
        let frameIndex = -1;
        
        if (options.debug === true) {
            frameName = Object.keys(this.atlasData?.frames || {}).find(name => 
                this.atlasData.frames[name] === frameData) || 'Unknown Frame';
            
            const match = frameName.match(/(\d+)$/);
            if (match) {
                frameIndex = parseInt(match[1]);
            }
        }
        
        // Merge default options
        const defaultOptions = {
            flipX: false,          // Horizontal flip
            flipY: false,          // Vertical flip
            correctRotation: true, // Whether to automatically correct rotation direction issues
            rotationDirection: -1, // Rotation direction: 1=clockwise, -1=counterclockwise
            rotationAngle: Math.PI/2, // Rotation angle (default 90 degrees)
            rotationFlipX: false,  // Whether to flip horizontally after rotation
            rotationFlipY: true,   // Whether to flip vertically after rotation
            scale: 1.0,            // Scale factor
            opacity: 1.0,          // Opacity
            debug: false,          // Debug mode
            preserveAspectRatio: true, // Maintain aspect ratio to prevent image distortion
            fitToContainer: true,   // Fit to container to ensure the image is fully visible
            alignment: 'center'     // Image alignment: 'center', 'top', 'bottom'
        };
        
        const opts = { ...defaultOptions, ...options };
        
        // Determine the sprite sheet to use
        let activeSheet = spriteSheet;
        if (typeof spriteSheet === 'object' && !spriteSheet.complete) {
            // If provided is an image collection object
            if (frameData.imageIndex !== undefined && spriteSheet[frameData.imageIndex]) {
                activeSheet = spriteSheet[frameData.imageIndex];
            } else if (spriteSheet.default) {
                activeSheet = spriteSheet.default;
            } else {
                this.error('[SpriteAtlasHelper] No sprite sheet found for this frame');
                return;
            }
        }
        
        // Check if the sprite sheet has loaded
        if (!activeSheet || !activeSheet.complete) {
            this.error('[SpriteAtlasHelper] Sprite sheet has not finished loading');
            return;
        }
        
        // Clear the canvas completely (transparent background)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        try {
            ctx.save();
            
            // Set global opacity
            ctx.globalAlpha = opts.opacity;
            
            // Check if the frame is rotated
            const isRotated = frameData.rotate === true;
            
            // Frame position and size in the sprite sheet
            const srcX = frameData.x;
            const srcY = frameData.y;
            const srcWidth = isRotated ? frameData.height : frameData.width;
            const srcHeight = isRotated ? frameData.width : frameData.height;
            
            // Record applied transformations (only in debug mode)
            const transforms = opts.debug ? [] : null;
            
            // Move to the center of the canvas
            ctx.translate(canvas.width / 2, canvas.height / 2);
            if (opts.debug && transforms) transforms.push('Center translate');
            
            // If flipping horizontally, scale on the X-axis
            if (opts.flipX) {
                ctx.scale(-1, 1);
                if (opts.debug && transforms) transforms.push('FlipX');
            }
            
            // If flipping vertically, scale on the Y-axis
            if (opts.flipY) {
                ctx.scale(1, -1);
                if (opts.debug && transforms) transforms.push('FlipY');
            }
            
            // Draw the frame
            if (isRotated) {
                // Special handling for rotated frames
                
                // Rotate based on configured rotation direction and angle
                const rotationAmount = opts.rotationDirection * opts.rotationAngle;
                ctx.rotate(rotationAmount);
                if (opts.debug && transforms) {
                    transforms.push(`Rotate ${opts.rotationDirection > 0 ? 'CW' : 'CCW'} ${(opts.rotationAngle * 180 / Math.PI).toFixed(0)}°`);
                }
                
                // If direction correction is needed, apply additional flips
                if (opts.correctRotation) {
                    let scaleX = opts.rotationFlipX ? -1 : 1;
                    let scaleY = opts.rotationFlipY ? -1 : 1;
                    ctx.scale(scaleX, scaleY);
                    
                    if (opts.debug && transforms) {
                        if (opts.rotationFlipX) transforms.push('RotFlipX');
                        if (opts.rotationFlipY) transforms.push('RotFlipY');
                    }
                }
                
                // Calculate drawing size to fit the container, considering rotation (width and height are swapped)
                let drawWidth, drawHeight;
                
                if (opts.preserveAspectRatio) {
                    // After rotation, the source width and height are swapped
                    const srcRatio = srcHeight / srcWidth; // Note: width and height are swapped here
                    const canvasRatio = canvas.width / canvas.height;
                    
                    if (srcRatio > canvasRatio) {
                        // Source image is wider (considering swap), should base on height
                        drawHeight = canvas.width * opts.scale;
                        drawWidth = drawHeight / srcRatio;
                    } else {
                        // Source image is taller (considering swap), should base on width
                        drawWidth = canvas.height * opts.scale;
                        drawHeight = drawWidth * srcRatio;
                    }
                    
                    // If fitToContainer option is enabled, ensure it does not exceed the container
                    if (opts.fitToContainer) {
                        if (drawWidth > canvas.height) {
                            drawWidth = canvas.height * opts.scale;
                            drawHeight = drawWidth * srcRatio;
                        }
                        if (drawHeight > canvas.width) {
                            drawHeight = canvas.width * opts.scale;
                            drawWidth = drawHeight / srcRatio;
                        }
                    }
                } else {
                    // Do not maintain aspect ratio, directly use canvas size
                    drawWidth = canvas.height * opts.scale;
                    drawHeight = canvas.width * opts.scale;
                }
                
                // Calculate drawing position (centered)
                const drawX = -drawWidth / 2;
                const drawY = -drawHeight / 2;
                
                // Draw the rotated frame
                ctx.drawImage(
                    activeSheet,
                    srcX, srcY, srcWidth, srcHeight,  // Source
                    drawX, drawY, drawWidth, drawHeight // Target
                );
                
                // In debug mode, draw borders and direction indicators
                if (opts.debug) {
                    ctx.strokeStyle = 'red';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
                    
                    // Add direction indicator for debugging
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(0, -20);
                    ctx.strokeStyle = 'blue';
                    ctx.stroke();
                    
                    // Add text label
                    ctx.fillStyle = 'white';
                    ctx.font = '12px Arial';
                    ctx.fillText('UP', 0, -25);
                    
                    // Add frame information
                    ctx.fillStyle = 'yellow';
                    ctx.fillText(`FRAME ${frameIndex}`, 0, -40);
                    
                    // Add transformation information
                    ctx.fillText(`TRANSFORM: ${transforms.join(', ')}`, 0, 40);
                    
                    // Add image information
                    const imageInfo = frameData.imageIndex !== undefined ? 
                        `IMAGE: ${frameData.imageIndex}` : 'IMAGE: default';
                    ctx.fillText(imageInfo, 0, 60);
                }
            } else {
                // Calculate drawing size to fit the container
                let drawWidth, drawHeight;
                
                if (opts.preserveAspectRatio) {
                    // Calculate source and target aspect ratios
                    const srcRatio = srcWidth / srcHeight;
                    const canvasRatio = canvas.width / canvas.height;
                    
                    if (srcRatio > canvasRatio) {
                        // Source image is wider, should base on width
                        drawWidth = canvas.width * opts.scale;
                        drawHeight = drawWidth / srcRatio;
                    } else {
                        // Source image is taller, should base on height
                        drawHeight = canvas.height * opts.scale;
                        drawWidth = drawHeight * srcRatio;
                    }
                    
                    // If fitToContainer option is enabled, ensure it does not exceed the container
                    if (opts.fitToContainer) {
                        if (drawWidth > canvas.width) {
                            drawWidth = canvas.width * opts.scale;
                            drawHeight = drawWidth / srcRatio;
                        }
                        if (drawHeight > canvas.height) {
                            drawHeight = canvas.height * opts.scale;
                            drawWidth = drawHeight * srcRatio;
                        }
                    }
                } else {
                    // Do not maintain aspect ratio, directly use canvas size
                    drawWidth = canvas.width * opts.scale;
                    drawHeight = canvas.height * opts.scale;
                }
                
                // Calculate drawing position (centered)
                const drawX = -drawWidth / 2;
                const drawY = -drawHeight / 2;
                
                // Draw the normal frame
                ctx.drawImage(
                    activeSheet,
                    srcX, srcY, srcWidth, srcHeight,  // Source
                    drawX, drawY, drawWidth, drawHeight // Target
                );
                
                // In debug mode, draw borders and direction indicators
                if (opts.debug) {
                    ctx.strokeStyle = 'green';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
                    
                    // Add direction indicator for debugging
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(0, -20);
                    ctx.strokeStyle = 'blue';
                    ctx.stroke();
                    
                    // Add text label
                    ctx.fillStyle = 'white';
                    ctx.font = '12px Arial';
                    ctx.fillText('UP', 0, -25);
                    
                    // Add frame information
                    ctx.fillStyle = 'yellow';
                    ctx.fillText(`FRAME ${frameIndex}`, 0, -40);
                    
                    // Add transformation information
                    ctx.fillText(`TRANSFORM: ${transforms.join(', ')}`, 0, 40);
                    
                    // Add image information
                    const imageInfo = frameData.imageIndex !== undefined ? 
                        `IMAGE: ${frameData.imageIndex}` : 'IMAGE: default';
                    ctx.fillText(imageInfo, 0, 60);
                }
            }
            
            ctx.restore();
        } catch (error) {
            console.error('[SpriteAtlasHelper] Error drawing frame:', error);
        }
    }
    
    /**
     * Preload multiple associated images
     * @param {string} basePath - Base part of the image path
     * @param {Array} fileNames - Array of image file names or a single file name
     * @returns {Promise<Object>} Loaded image object
     */
    loadImages(basePath, fileNames) {
        // Convert to array if it's just a single file name
        const files = Array.isArray(fileNames) ? fileNames : [fileNames];
        
        // Create promises for loading all images
        const loadPromises = files.map((fileName, index) => {
            return this.loadImage(`${basePath}/${fileName}`).then(img => {
                return { index, img };
            });
        });
        
        // Wait for all images to load
        return Promise.all(loadPromises).then(results => {
            // Create result object
            const images = {};
            
            results.forEach(({ index, img }) => {
                images[index] = img;
            });
            
            // Add default reference pointing to the first image
            if (results.length > 0) {
                images.default = results[0].img;
            }
            
            return images;
        });
    }
    
    /**
     * Preload an image
     * @param {string} imagePath - Image path
     * @returns {Promise<HTMLImageElement>} Promise for the loaded image
     */
    loadImage(imagePath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(new Error(`Unable to load image: ${imagePath}`));
            img.src = imagePath;
        });
    }
    
    /**
     * Debug log
     */
    log(...args) {
        if (this.debug) {
            console.log('[SpriteAtlasHelper]', ...args);
        }
    }
    
    /**
     * Error log
     */
    error(...args) {
        console.error('[SpriteAtlasHelper]', ...args);
    }
}

// Create global instance
const spriteAtlasHelper = new SpriteAtlasHelper();
spriteAtlasHelper.debug = true; // Enable debug

// Export global instance
window.SpriteAtlasHelper = spriteAtlasHelper; 