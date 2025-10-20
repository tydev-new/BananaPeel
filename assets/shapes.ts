// This file programmatically creates the test image required by the test plan.
// This avoids needing to add a static asset to the project, which is not
// possible in this environment.

export const createShapesImageFile = (): Promise<File> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return reject(new Error('Could not create canvas context for test image'));
        }

        // 1. Plain white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 512, 512);

        // 2. 50x50 pixel red square in the top-left quadrant.
        // Quadrant center: (128, 128). Top-left of square: (128-25, 128-25) = (103, 103)
        ctx.fillStyle = 'red';
        ctx.fillRect(103, 103, 50, 50);

        // 3. 50-pixel diameter blue circle in the exact center.
        // Center: (256, 256). Radius: 25.
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(256, 256, 25, 0, 2 * Math.PI);
        ctx.fill();

        // 4. 50x50 pixel green equilateral triangle in the bottom-right quadrant.
        // Quadrant center: (384, 384).
        const triSize = 50;
        const triHeight = (Math.sqrt(3) / 2) * triSize;
        const triCenterX = 384;
        const triCenterY = 384;

        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.moveTo(triCenterX, triCenterY - triHeight / 2); // Top vertex
        ctx.lineTo(triCenterX - triSize / 2, triCenterY + triHeight / 2); // Bottom-left vertex
        ctx.lineTo(triCenterX + triSize / 2, triCenterY + triHeight / 2); // Bottom-right vertex
        ctx.closePath();
        ctx.fill();

        canvas.toBlob((blob) => {
            if (!blob) {
                return reject(new Error('Canvas toBlob failed'));
            }
            const file = new File([blob], 'shapes.png', { type: 'image/png' });
            resolve(file);
        }, 'image/png');
    });
};