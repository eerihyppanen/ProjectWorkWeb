const requestBody = {
    "query": [
        {
            "code": "Vuosi",
            "selection": {
                "filter": "item",
                "values": [
                    "2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009",
                    "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019",
                    "2020", "2021"
                ]
            }
        },
        {
            "code": "Alue",
            "selection": {
                "filter": "item",
                "values": ["SSS"]
            }
        },
        {
            "code": "Tiedot",
            "selection": {
                "filter": "item",
                "values": ["vaesto"]
            }
        }
    ],
    "response": {
        "format": "json-stat2"
    }
};

let chart;

document.addEventListener("DOMContentLoaded", async () => {

    let chartType = 'line';
    
    let chartData;

    const getData = async ()=> {
        const url = "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px"

        const res = await fetch(url, {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify(requestBody)

        });
        if(!res.ok)  {
            return;
        }
        const data = await res.json()
        //console.log(data);
        return data;


    };







    const buildChart = async () => {
        const data = await getData()
        //console.log(data);

        
        const labels = Object.values(data.dimension.Vuosi.category.label);
        const values = data.value;
        
        
        console.log(labels)
        console.log(values)


        

        const chartData = {
            labels: labels,
            datasets:[
                {
                    name: "Population", 
                    values: values
                }
            ]
        };
        console.log("Chart data: ", chartData);
        console.log("Building chart...");

        createChart(chartData, chartType);

        
        document.getElementById("line-chart").addEventListener("click", function() {
            chartType = 'line';
            createChart(chartData, chartType);
        });

        document.getElementById("bar-chart").addEventListener("click", function() {
            chartType = 'bar';
            createChart(chartData, chartType);
        });

        document.getElementById("pie-chart").addEventListener("click", function() {
            chartType = 'pie';
            createChart(chartData, chartType);
        });
    };

    function createChart(data, type) {
        
           
        document.querySelector("#chart").innerHTML = '';
        

        chart = new frappe.Chart("#chart", {
            title: "Population Data from 2000 to 2021",
            data: data,
            type: type,
            height: 500,
            colors: ['#eb5146'],
            barOptions: {
                stacked: type === 'bar' ? 1 : 0
            },
            lineOptions: {
                hideDots: 1,
                regionFill: 0
            },
            axisOptions: {
                xIsSeries: true
            }
        });
    }
       



    buildChart() 
    //https://frappe.io/charts/docs/exporting/images
    //https://frappe.io/charts/docs/update_state/modify_data

    
    
});

function updateChartWithNewData(areaData) {
    const labels = ["Positive Migration", "Negative Migration", "Employment"];
            const values = [areaData.positiveMigration, areaData.negativeMigration, areaData.employmentData];

            const newChartData = {
                labels: labels,
                datasets: [
                    {
                        name: "Statistics",
                        values: values
                    }
                ]
            };

            if (chart) {
                chart.update(newChartData);
            }
}






const fetchData = async () => {
    const url = "https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326"
    const positiveUrl = "https://statfin.stat.fi/PxWeb/sq/4bb2c735-1dc3-4c5e-bde7-2165df85e65f"
    const negativeUrl = "https://statfin.stat.fi/PxWeb/sq/944493ca-ea4d-4fd9-a75c-4975192f7b6e"
    const employmentUrl = "https://statfin.stat.fi/PxWeb/sq/5e288b40-f8c8-4f1e-b3b0-61b86ce5c065";

    const res = await fetch(url);
    const res2 = await fetch(positiveUrl);
    const res3 = await fetch(negativeUrl);
    const dataPromise2 = await fetch(employmentUrl)

    const data = await res.json();
    const positiveMigration = await res2.json();
    const negativeMigration = await res3.json();
    const employment = await dataPromise2.json()

    initmap(data, positiveMigration, negativeMigration, employment);

}

const initmap = (data, positiveMigration, negativeMigration, employment) => {


    const positiveData = positiveMigration.dataset.value;
    const negativeData = negativeMigration.dataset.value;
    const employmentData = employment.dataset.value;
    const municipalityCodes = positiveMigration.dataset.dimension.Tuloalue.category.index;

    const positiveMigrationMap = {};
    const negativeMigrationMap = {};
    const employmentMap = {};

    Object.keys(municipalityCodes).forEach(key => {
        positiveMigrationMap[key] = positiveData[municipalityCodes[key]];
        negativeMigrationMap[key] = negativeData[municipalityCodes[key]];
        employmentMap[key] = employmentData[municipalityCodes[key]];
    });

    

    data.features.forEach(feature => {
        const municipalityCode = `KU${feature.properties.kunta}`; 

        if (municipalityCode in positiveMigrationMap) {
            feature.properties.positiveMigration = positiveMigrationMap[municipalityCode] || 0; 
            feature.properties.negativeMigration = negativeMigrationMap[municipalityCode] || 0; 
            feature.properties.employment = employmentMap[municipalityCode] || 0;
        } else {
            console.warn(`Municipality code not found for: ${municipalityCode}`);
        }
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
    const employmentData = feature.properties.employment;

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
                `<strong>${name}</strong><br>Positive Migration: ${positiveMigration}<br>Negative Migration: ${negativeMigration}<br>Employment: ${employmentData}`
            ).openPopup(e.latlng);

            updateChartWithNewData({
                positiveMigration,
                negativeMigration,
                employmentData
            });
        }
    });
    
}

fetchData();