document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('map-canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    const TILE_SIZE = 32;

    const camera = {
        x: 0,
        y: 0,
        zoom: 1
    };

    function drawGrid() {
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1 / camera.zoom;

        const scaledTileSize = TILE_SIZE * camera.zoom;

        const startX = Math.floor(camera.x / TILE_SIZE) * TILE_SIZE;
        const startY = Math.floor(camera.y / TILE_SIZE) * TILE_SIZE;

        const endX = camera.x + (canvas.width / camera.zoom);
        const endY = camera.y + (canvas.height / camera.zoom);

        for (let x = startX; x < endX; x += TILE_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        for (let y = startY; y < endY; y += TILE_SIZE) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }

    function render() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save context state
        ctx.save();

        // Apply camera transformations (pan and zoom)
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.translate(-camera.x, -camera.y);

        drawGrid();

        // Draw map objects
        mapObjects.forEach(obj => {
            ctx.drawImage(obj.img, obj.x, obj.y);
        });

        // Draw selection box for selected map object
        if (selectedMapObject) {
            ctx.strokeStyle = '#00aaff';
            ctx.lineWidth = 2 / camera.zoom;
            ctx.strokeRect(selectedMapObject.x, selectedMapObject.y, selectedMapObject.img.width, selectedMapObject.img.height);
        }

        // Restore context state
        ctx.restore();

        requestAnimationFrame(render);
    }

    // Start the render loop
    render();

    // --- Pan functionality ---
    let isPanning = false;
    let lastMousePos = { x: 0, y: 0 };

    // --- Map data & Inspector ---
    let mapObjects = [];
    let selectedMapObject = null;
    const inspectorPanel = document.getElementById('inspector-panel');

    function updateInspector() {
        if (selectedMapObject) {
            inspectorPanel.innerHTML = `
                <h3>Inspector</h3>
                <p><strong>Object:</strong> ${selectedMapObject.img.title}</p>
                <p><strong>X:</strong> ${selectedMapObject.x}</p>
                <p><strong>Y:</strong> ${selectedMapObject.y}</p>
                <button id="delete-object-btn">Delete Object</button>
            `;
            document.getElementById('delete-object-btn').addEventListener('click', () => {
                mapObjects = mapObjects.filter(obj => obj !== selectedMapObject);
                selectedMapObject = null;
                updateInspector();
            });
        } else {
            inspectorPanel.innerHTML = '<h3>Inspector</h3><p>No object selected.</p>';
        }
    }

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left mouse button
            // Convert screen coordinates to world coordinates
            const mouseX = e.offsetX;
            const mouseY = e.offsetY;
            const worldX = (mouseX - canvas.width / 2) / camera.zoom + canvas.width / 2 + camera.x;
            const worldY = (mouseY - canvas.height / 2) / camera.zoom + canvas.height / 2 + camera.y;

            if (selectedObject) {
                // Place new object
                const gridX = Math.floor(worldX / TILE_SIZE) * TILE_SIZE;
                const gridY = Math.floor(worldY / TILE_SIZE) * TILE_SIZE;

                const newObject = {
                    img: selectedObject,
                    x: gridX,
                    y: gridY
                };
                mapObjects.push(newObject);
                // Deselect from palette after placing
                selectedObject.classList.remove('selected');
                selectedObject = null;
            } else {
                // Select an existing object
                selectedMapObject = null;
                // Find the top-most object under the cursor
                for (let i = mapObjects.length - 1; i >= 0; i--) {
                    const obj = mapObjects[i];
                    if (worldX >= obj.x && worldX <= obj.x + obj.img.width &&
                        worldY >= obj.y && worldY <= obj.y + obj.img.height) {
                        selectedMapObject = obj;
                        break;
                    }
                }
                updateInspector();
            }
        } else if (e.button === 1) { // Middle mouse button for panning
            isPanning = true;
            lastMousePos = { x: e.clientX, y: e.clientY };
            canvas.style.cursor = 'grabbing';
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isPanning) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            camera.x -= dx;
            camera.y -= dy;
            lastMousePos = { x: e.clientX, y: e.clientY };
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 1) {
            isPanning = false;
            canvas.style.cursor = 'default';
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isPanning = false;
        canvas.style.cursor = 'default';
    });

    // --- Zoom functionality ---
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const oldZoom = camera.zoom;

        if (e.deltaY < 0) {
            camera.zoom *= (1 + zoomSpeed);
        } else {
            camera.zoom /= (1 + zoomSpeed);
        }

        // Clamp zoom level
        camera.zoom = Math.max(0.1, Math.min(camera.zoom, 10));

        // Adjust camera position to zoom towards the mouse pointer
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

        camera.x = (mouseX / oldZoom) + camera.x - (mouseX / camera.zoom);
        camera.y = (mouseY / oldZoom) + camera.y - (mouseY / camera.zoom);
    });

    // --- Keyboard shortcuts ---
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && selectedMapObject) {
            mapObjects = mapObjects.filter(obj => obj !== selectedMapObject);
            selectedMapObject = null;
            updateInspector();
        }
    });

    // --- Save/Load functionality ---
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const loadInput = document.getElementById('load-input');

    saveBtn.addEventListener('click', () => {
        const mapData = mapObjects.map(obj => ({
            src: obj.img.src.substring(obj.img.src.lastIndexOf('maps/')),
            title: obj.img.title,
            x: obj.x,
            y: obj.y
        }));
        const json = JSON.stringify(mapData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'map.map';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    loadBtn.addEventListener('click', () => {
        loadInput.click();
    });

    loadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const mapData = JSON.parse(event.target.result);
                mapObjects = [];
                selectedMapObject = null;
                updateInspector();

                mapData.forEach(objData => {
                    const img = new Image();
                    // Prepend '../' to the path to make it relative to the map-editor directory
                    img.src = '../' + objData.src;
                    img.title = objData.title;
                    const newObject = {
                        img: img,
                        x: objData.x,
                        y: objData.y
                    };
                    mapObjects.push(newObject);
                });
            } catch (error) {
                console.error("Error loading map:", error);
                alert("Failed to load map file. Make sure it is a valid .map file.");
            }
        };
        reader.readAsText(file);
        // Reset file input so the same file can be loaded again
        e.target.value = '';
    });

    // --- Object Palette ---
    const objectList = document.getElementById('object-list');
    let selectedObject = null;

    const objects = [
        { name: 'Buildings', src: '../maps/buildings.png' },
        { name: 'Terrain', src: '../maps/firered_terrain.png' }
    ];

    objects.forEach(obj => {
        const img = new Image();
        img.src = obj.src;
        img.title = obj.name;
        img.classList.add('palette-object');
        img.addEventListener('click', () => {
            if (selectedObject) {
                selectedObject.classList.remove('selected');
            }
            selectedObject = img;
            selectedObject.classList.add('selected');
        });
        objectList.appendChild(img);
    });
});
