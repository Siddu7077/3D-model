let scene, camera, renderer, model, controls, loadedClothingModel, raycaster, mouse;
const modelPath = '/model/rbb.glb'; // Ensure this path is correct

function init() {
    console.log("Initializing the scene...");

    // Scene setup
    scene = new THREE.Scene();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(2, 1.6, 20); // Adjusted initial camera position for better view

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xffffff, 1); // Set background color to white
    document.getElementById('model-container').appendChild(renderer.domElement);

    // Light setup
    const ambientLight = new THREE.AmbientLight(0xf0f000, 2); // Soft white light
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(10, 10, 10).normalize();
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(-10, -10, -10).normalize();
    scene.add(directionalLight2);

    // Load model
    const loader = new THREE.GLTFLoader();
    loader.load(
        modelPath,
        (gltf) => {
            model = gltf.scene;
            scene.add(model);
            console.log('Model loaded successfully');
            animate();
        },
        undefined,
        (error) => {
            console.error('An error occurred while loading the model:', error);
        }
    );

    // Controls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 500;
    controls.update();

    // Initialize raycaster and mouse vector
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Event listeners for controls
    document.getElementById('height').addEventListener('input', updateModel);
    document.getElementById('fitness').addEventListener('input', updateModel);
    document.getElementById('color').addEventListener('input', updateColor); // New event listener for color

    // File input event listener
    document.getElementById('file-input').addEventListener('change', handleFileUpload);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Mouse move and wheel event listeners
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('wheel', onMouseWheel, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    // Update mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseWheel(event) {
    // Update the raycaster with the mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the raycaster
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        controls.target.copy(intersect.point);
        controls.update();
    }
}

function updateModel() {
    const heightValue = document.getElementById('height').value;
    const fitnessValue = document.getElementById('fitness').value;

    if (model) {
        model.scale.set(fitnessValue / 5, heightValue / 5, fitnessValue / 5);
        console.log(`Model updated: height=${heightValue}, fitness=${fitnessValue}`);

        // If clothing model is loaded, adjust its scale and position as well
        if (loadedClothingModel) {
            loadedClothingModel.scale.set(fitnessValue / 5, heightValue / 5, fitnessValue / 5);

            // Center the clothing model on the human model
            const modelBox = new THREE.Box3().setFromObject(model);
            const clothingBox = new THREE.Box3().setFromObject(loadedClothingModel);

            const modelCenter = new THREE.Vector3();
            const clothingCenter = new THREE.Vector3();

            modelBox.getCenter(modelCenter);
            clothingBox.getCenter(clothingCenter);

            loadedClothingModel.position.sub(clothingCenter).add(modelCenter);

            // Adjust position to align with specific body parts
            alignClothing(loadedClothingModel);

            // Update clothing position based on controls
            updateClothingPosition();
        }
    }
}

function updateColor() {
    const colorValue = document.getElementById('color').value;

    if (model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.material.color.set(colorValue);
            }
        });
        console.log(`Model color updated: color=${colorValue}`);
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const contents = e.target.result;
            const loader = new THREE.GLTFLoader();
            loader.parse(contents, '', (gltf) => {
                if (loadedClothingModel) {
                    model.remove(loadedClothingModel);
                }
                loadedClothingModel = gltf.scene;

                // Adjust the position, rotation, and scale of the clothing model
                loadedClothingModel.position.set(0, 0, 0);
                loadedClothingModel.rotation.set(0, 0, 0);

                // Calculate the scale factor and position to fit the human model
                const modelBox = new THREE.Box3().setFromObject(model);
                const clothingBox = new THREE.Box3().setFromObject(loadedClothingModel);
                
                const modelSize = new THREE.Vector3();
                const clothingSize = new THREE.Vector3();
                
                modelBox.getSize(modelSize);
                clothingBox.getSize(clothingSize);

                // Calculate scale factor to fit the human model
                const scaleFactor = Math.min(modelSize.x / clothingSize.x, modelSize.y / clothingSize.y, modelSize.z / clothingSize.z);
                loadedClothingModel.scale.set(scaleFactor, scaleFactor, scaleFactor);

                // Center the clothing model on the human model
                clothingBox.setFromObject(loadedClothingModel);
                const clothingCenter = new THREE.Vector3();
                clothingBox.getCenter(clothingCenter);

                const modelCenter = new THREE.Vector3();
                modelBox.getCenter(modelCenter);

                loadedClothingModel.position.sub(clothingCenter).add(modelCenter);

                // Adjust position to align with specific body parts
                alignClothing(loadedClothingModel);

                // Debug: log the clothing model structure
                console.log('Clothing model:', loadedClothingModel);

                // Add clothing model to the main model
                model.add(loadedClothingModel);
                console.log('Clothing model loaded successfully');

                // Disable height and fitness controls, show clothing controls
                document.getElementById('height').disabled = true;
                document.getElementById('fitness').disabled = true;
                document.querySelector('.clothing-controls').style.display = 'block';

                // Set up event listener for clothing controls
                document.getElementById('clothing-scale').addEventListener('input', updateClothingScale);
                document.getElementById('clothing-x').addEventListener('input', updateClothingPosition);
                document.getElementById('clothing-y').addEventListener('input', updateClothingPosition);
                document.getElementById('clothing-z').addEventListener('input', updateClothingPosition);
                document.getElementById('clothing-rotate-x').addEventListener('input', updateClothingRotation);
                document.getElementById('clothing-rotate-y').addEventListener('input', updateClothingRotation);
            }, undefined, (error) => {
                console.error('An error occurred while loading the clothing model:', error);
            });
        };
        reader.readAsArrayBuffer(file);
    }
}

function updateClothingScale() {
    const scaleValue = document.getElementById('clothing-scale').value;

    if (loadedClothingModel) {
        loadedClothingModel.scale.set(scaleValue, scaleValue, scaleValue);
        console.log(`Clothing model scale updated: scale=${scaleValue}`);
    }
}

function updateClothingPosition() {
    const xValue = parseFloat(document.getElementById('clothing-x').value);
    const yValue = parseFloat(document.getElementById('clothing-y').value);
    const zValue = parseFloat(document.getElementById('clothing-z').value);

    if (loadedClothingModel) {
        loadedClothingModel.position.set(xValue, yValue, zValue);
        console.log(`Clothing model position updated: x=${xValue}, y=${yValue}, z=${zValue}`);
    }
}

function updateClothingRotation() {
    const rotateX = parseFloat(document.getElementById('clothing-rotate-x').value) * Math.PI / 180;
    const rotateY = parseFloat(document.getElementById('clothing-rotate-y').value) * Math.PI / 180;

    if (loadedClothingModel) {
        loadedClothingModel.rotation.set(rotateX, rotateY, 0);
        console.log(`Clothing model rotation updated: rotateX=${rotateX}, rotateY=${rotateY}`);
    }
}

function alignClothing(clothingModel) {
    // Adjust the position based on the type of clothing
    // Here, we make some assumptions about the structure of the clothing model
    // You can customize this function based on the actual structure of your clothing models

    // Example: Adjusting pants to align with the waist
    if (clothingModel.name.toLowerCase().includes('pants')) {
        // Move the pants model upwards to the waist area
        clothingModel.position.y += 1.0; // Adjust this value based on your model
    }

    // Example: Adjusting shirt to align with the upper body
    if (clothingModel.name.toLowerCase().includes('shirt')) {
        // Move the shirt model upwards to the chest area
        clothingModel.position.y += 1.5; // Adjust this value based on your model
    }

    // Add more conditions as needed for different clothing types
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

window.onload = init;
