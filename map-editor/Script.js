document.addEventListener('DOMContentLoaded', () => {
    const tileSelector = document.getElementById('tileSelector');

    const images = [
        "https://raw.githubusercontent.com/leduc1984/2.5d-pokemon/master/maps/buildings.png",
        // Ajoutez d'autres URLs d'images ici
    ];

    images.forEach(url => {
        const img = new Image();
        img.src = url;
        img.onclick = function() {
            // Logique pour sélectionner cette tuile pour la création de carte
        };
        tileSelector.appendChild(img);
    });

    // Implémentez ici la logique pour la création et l'interaction avec la carte
});
