const fetchData = async () => {
    const url = "https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326"
    const positiveUrl = "https://statfin.stat.fi/PxWeb/sq/4bb2c735-1dc3-4c5e-bde7-2165df85e65f"
    const negativeUrl = "https://statfin.stat.fi/PxWeb/sq/944493ca-ea4d-4fd9-a75c-4975192f7b6e"

    const res = await fetch(url);
    const res2 = await fetch(positiveUrl);
    const res3 = await fetch(negativeUrl);

    const data = await res.json();
    const positiveMigration = await res2.json();
    const negativeMigration = await res3.json();

    initmap(data, positiveMigration, negativeMigration);

}

const initmap = (data, positiveMigration, negativeMigration) => {


    const positiveData = positiveMigration.dataset.value;
    const negativeData = negativeMigration.dataset.value;

    data.features.forEach(feature => {
        const municipalityCode = feature.properties.kunta;
        feature.properties.positiveMigration = positiveData[municipalityCode];
        feature.properties.negativeMigration = negativeData[municipalityCode];
    });


    let map = L.map('map', {
        minZoom: -2

    })

    let geoJson = L.geoJSON(data, {
        onEachFeature: getFeature,
        weight: 2
        

    }).addTo(map)
    
    let osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 15,
        minZoom: 2
    }).addTo(map);

    let google = L.tileLayer("https://{s}.google.com/vt/lyrs=s@221097413,traffic&x={x}&y={y}&z={z}", {
        maxZoom: 15,
        minZoom: 2,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map)

    let baseMaps = {
        "openStreetMap": osm,
        "googleMaps": google
    }

    let overlayMaps = {
        "municapities": geoJson
    }

    let layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map)

    map.fitBounds(geoJson.getBounds())

}

const getFeature =(feature, layer) =>   {
    if (!feature.properties.name) return;
    const name = feature.properties.name;
    const positiveMigration = feature.properties.positiveMigration;
    const negativeMigration = feature.properties.negativeMigration;

    layer.on({
        mouseover: (e) => {
            layer.bindTooltip(name, {
                permanent: false,
                direction: "top"
            }).openTooltip(e.latlng);
        },
        mouseout: (e) => {
            layer.closeTooltip();
        },
        click: (e) => {
            layer.bindPopup(
                `<strong>${name}</strong><br>Positive Migration: ${positiveMigration}<br>Negative Migration: ${negativeMigration}`
            ).openPopup(e.latlng);
        }
    });
    
}

fetchData();