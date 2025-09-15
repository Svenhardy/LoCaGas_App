// URLs für die CSV-Dateien
const URL_DUAL_FUEL_BACKGROUND = "https://raw.githubusercontent.com/Svenhardy/LoCaGas_App/main/Background_Data/CSV_Files/1.Dual_Fuel_Background_Data.csv";
const URL_DUAL_FUEL_IMPACTS = "https://raw.githubusercontent.com/Svenhardy/LoCaGas_App/main/Background_Data/CSV_Files/2.Dual_Fuel_Impacts.csv";
const URL_EMISSION_IMPACTS = "https://raw.githubusercontent.com/Svenhardy/LoCaGas_App/main/Background_Data/CSV_Files/3.Emission_Impacts.csv";
const URL_ENGINE_DATA = "https://raw.githubusercontent.com/Svenhardy/LoCaGas_App/main/Background_Data/CSV_Files/4.Engine_Data.csv";
const URL_ASSUMPTIONS = "https://raw.githubusercontent.com/Svenhardy/LoCaGas_App/main/Background_Data/CSV_Files/5.Assumptions.csv";
const URL_EMISSIONS = "https://raw.githubusercontent.com/Svenhardy/LoCaGas_App/main/Background_Data/CSV_Files/6.Emission.csv";

// Globale Variablen
let dataFrames = {};
let resultsData = {};
let barChart = null;
let lineChart = null;

// Event Listener nach DOM geladen
document.addEventListener('DOMContentLoaded', function() {
    // Tab-Funktionalität
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            // Aktiven Tab entfernen
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Neuen Tab aktivieren
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Manuelle Eingabe Toggle
    document.getElementById('manual-gas-input').addEventListener('change', function() {
        const container = document.getElementById('manual-gas-container');
        container.style.display = this.checked ? 'block' : 'none';
        updateManualFields();
    });
    
    document.getElementById('manual-methane-input').addEventListener('change', function() {
        const container = document.getElementById('manual-methane-container');
        container.style.display = this.checked ? 'block' : 'none';
        updateManualFields();
    });
    
    // Zeitraum-Änderung für manuelle Felder
    document.getElementById('time-period').addEventListener('input', updateManualFields);
    
    // Berechnungsbutton
    document.getElementById('calculate-button').addEventListener('click', runCalculation);
    
    // Dropdown-Änderungen
    document.getElementById('impact-category').addEventListener('change', updateBarChart);
    document.getElementById('line-impact-category').addEventListener('change', updateLineChart);
    document.getElementById('stage-dropdown').addEventListener('change', updateLineChart);
    document.getElementById('table-stage-dropdown').addEventListener('change', displayTotalResultsTable);
    
    // Daten laden
    loadData();
});

// Funktion zum Laden der Daten
async function loadData() {
    const urls = {
        dual_fuel_background: URL_DUAL_FUEL_BACKGROUND,
        dual_fuel_impacts: URL_DUAL_FUEL_IMPACTS,
        emission_impacts: URL_EMISSION_IMPACTS,
        engine_data: URL_ENGINE_DATA,
        assumptions: URL_ASSUMPTIONS,
        emissions: URL_EMISSIONS,
    };
    
    try {
        for (const [name, url] of Object.entries(urls)) {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${url}`);
            
            const csvText = await response.text();
            let df;
            
            if (name === 'dual_fuel_impacts' || name === 'emission_impacts') {
                // Für diese Dateien die zweite Zeile (Unit-Zeile) überspringen
                const lines = csvText.split('\n');
                const filteredLines = lines.filter((line, index) => index !== 1);
                const filteredText = filteredLines.join('\n');
                df = parseCSV(filteredText);
            } else {
                df = parseCSV(csvText);
            }
            
            // Index für bestimmte DataFrames setzen
            if (name === 'assumptions') {
                const indexedDf = {};
                df.forEach(row => {
                    indexedDf[row.Category] = parseFloat(row.Value);
                });
                dataFrames[name] = indexedDf;
            } else if (name === 'dual_fuel_impacts' || name === 'emission_impacts') {
                const indexedDf = {};
                const idKey = name === 'dual_fuel_impacts' ? 'Impact Category' : 'Category';
                
                df.forEach(row => {
                    const key = row[idKey];
                    indexedDf[key] = {};
                    
                    Object.entries(row).forEach(([col, value]) => {
                        if (col !== idKey) {
                            indexedDf[key][col] = parseFloat(value) || 0;
                        }
                    });
                });
                dataFrames[name] = indexedDf;
            } else {
                // Numerische Werte konvertieren
                const processedDf = df.map(row => {
                    const processedRow = {};
                    Object.entries(row).forEach(([key, value]) => {
                        processedRow[key] = isNaN(value) ? value : parseFloat(value);
                    });
                    return processedRow;
                });
                dataFrames[name] = processedDf;
            }
        }
        
        updateImpactCategoryDropdown();
        console.log("All data loaded successfully.");
    } catch (error) {
        console.error("Error loading data:", error);
        alert("Daten konnten nicht geladen werden. Bitte überprüfen Sie Ihre Internetverbindung.");
    }
}

// CSV-Parser
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(';').map(header => header.trim());
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map(value => value.trim());
        if (values.length === headers.length && values.some(v => v !== '')) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            result.push(row);
        }
    }
    
    return result;
}

// Manuelle Eingabefelder aktualisieren
function updateManualFields() {
    const years = parseInt(document.getElementById('time-period').value) || 0;
    
    // Gas-Eingabefelder
    if (document.getElementById('manual-gas-input').checked) {
        const container = document.getElementById('manual-gas-entries');
        container.innerHTML = '';
        
        for (let i = 0; i < years; i++) {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'manual-entry';
            
            const label = document.createElement('label');
            label.textContent = `Jahr ${i + 1}:`;
            
            const input = document.createElement('input');
            input.type = 'number';
            input.value = (500 * Math.pow(0.9, i)).toFixed(2);
            
            entryDiv.appendChild(label);
            entryDiv.appendChild(input);
            container.appendChild(entryDiv);
        }
    }
    
    // Methan-Eingabefelder
    if (document.getElementById('manual-methane-input').checked) {
        const container = document.getElementById('manual-methane-entries');
        container.innerHTML = '';
        
        for (let i = 0; i < years; i++) {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'manual-entry';
            
            const label = document.createElement('label');
            label.textContent = `Jahr ${i + 1}:`;
            
            const input = document.createElement('input');
            input.type = 'number';
            input.min = 0;
            input.max = 100;
            input.value = (50 * Math.pow(0.9, i)).toFixed(2);
            
            entryDiv.appendChild(label);
            entryDiv.appendChild(input);
            container.appendChild(entryDiv);
        }
    }
}

// Wirkungskategorien-Dropdown aktualisieren
function updateImpactCategoryDropdown() {
    if (dataFrames.dual_fuel_impacts) {
        // Erste Zeile finden, um die Spaltennamen zu erhalten
        const firstKey = Object.keys(dataFrames.dual_fuel_impacts)[0];
        const categories = Object.keys(dataFrames.dual_fuel_impacts[firstKey]);
        
        const barDropdown = document.getElementById('impact-category');
        const lineDropdown = document.getElementById('line-impact-category');
        
        barDropdown.innerHTML = '';
        lineDropdown.innerHTML = '';
        
        categories.forEach(category => {
            const barOption = document.createElement('option');
            barOption.value = category;
            barOption.textContent = category;
            
            const lineOption = document.createElement('option');
            lineOption.value = category;
            lineOption.textContent = category;
            
            barDropdown.appendChild(barOption);
            lineDropdown.appendChild(lineOption);
        });
        
        if (categories.includes('Global warming')) {
            barDropdown.value = 'Global warming';
            lineDropdown.value = 'Global warming';
        } else if (categories.length > 0) {
            barDropdown.value = categories[0];
            lineDropdown.value = categories[0];
        }
    }
}

// Eingaben validieren
function validateInputs() {
    try {
        const years = parseInt(document.getElementById('time-period').value);
        if (isNaN(years) || years < 1 || years > 50) {
            throw new Error("Betrachtungszeitraum muss zwischen 1 und 50 Jahren liegen.");
        }
        
        if (!document.getElementById('manual-gas-input').checked) {
            const gasValue = parseFloat(document.getElementById('gas-volume').value);
            if (isNaN(gasValue)) throw new Error("Bitte geben Sie eine gültige Gasmenge ein.");
        } else {
            const gasInputs = document.querySelectorAll('#manual-gas-entries input');
            if (gasInputs.length !== years) {
                updateManualFields();
            }
            
            for (const input of gasInputs) {
                if (isNaN(parseFloat(input.value))) {
                    throw new Error("Bitte füllen Sie alle manuellen Gas-Felder aus.");
                }
            }
        }
        
        if (!document.getElementById('manual-methane-input').checked) {
            const methaneValue = parseFloat(document.getElementById('methane-content').value);
            if (isNaN(methaneValue) || methaneValue < 0 || methaneValue > 100) {
                throw new Error("Methangehalt muss zwischen 0 und 100% liegen.");
            }
        } else {
            const methaneInputs = document.querySelectorAll('#manual-methane-entries input');
            if (methaneInputs.length !== years) {
                updateManualFields();
            }
            
            for (const input of methaneInputs) {
                const value = parseFloat(input.value);
                if (isNaN(value) || value < 0 || value > 100) {
                    throw new Error("Methangehalt muss zwischen 0 und 100% liegen.");
                }
            }
        }
        
        return true;
    } catch (error) {
        alert("Ungültige Eingabe: " + error.message);
        return false;
    }
}

// Hauptberechnung durchführen
function runCalculation() {
    if (!validateInputs()) return;
    
    const years = parseInt(document.getElementById('time-period').value);
    const gasProfile = getGasProfile(years);
    if (!gasProfile) return;
    
    const engineLoadCheck = calculateEngineLoadForAll(gasProfile[0]);
    const bestEngine = findBestEngine(engineLoadCheck);
    
    displayIntermediateEngineLoad(engineLoadCheck);
    
    if (!bestEngine) {
        alert("Kein passender Motor gefunden. Für die eingegebenen Startwerte konnte kein geeigneter Motor gefunden werden (Auslastung > 100% für alle Größen).");
        return;
    }
    
    document.getElementById('selected-engine').textContent = `${bestEngine['Engine Size [kWel]']} kWel`;
    
    const yearlyResults = calculateYearlyImpacts(gasProfile, bestEngine);
    if (!yearlyResults) return;
    
    resultsData.yearly_impacts = yearlyResults.impacts;
    resultsData.total_impacts = {};
    
    for (const [stage, df] of Object.entries(yearlyResults.impacts)) {
        resultsData.total_impacts[stage] = {};
        for (const category of Object.keys(df[1])) {
            resultsData.total_impacts[stage][category] = Object.values(df).reduce((sum, yearData) => sum + (yearData[category] || 0), 0);
        }
    }
    
    // Betriebsjahre zählen
    const operationalYears = yearlyResults.intermediateData.filter(item => item.Status === 'In Betrieb').length;
    document.getElementById('operational-years').textContent = operationalYears;
    
    displayIntermediateYearlyData(yearlyResults.intermediateData);
    
    // Dropdowns für Lebensphasen aktualisieren
    const stages = ['Gesamt', ...Object.keys(resultsData.yearly_impacts)];
    const stageDropdown = document.getElementById('stage-dropdown');
    const tableStageDropdown = document.getElementById('table-stage-dropdown');
    
    stageDropdown.innerHTML = '';
    tableStageDropdown.innerHTML = '';
    
    stages.forEach(stage => {
        const option1 = document.createElement('option');
        option1.value = stage;
        option1.textContent = stage;
        
        const option2 = document.createElement('option');
        option2.value = stage;
        option2.textContent = stage;
        
        stageDropdown.appendChild(option1);
        tableStageDropdown.appendChild(option2);
    });
    
    stageDropdown.value = 'Gesamt';
    tableStageDropdown.value = 'Gesamt';
    
    displayTotalResultsTable('Gesamt');
    updateBarChart();
    updateLineChart();
}

// Gasprofil erstellen
function getGasProfile(years) {
    const gasValues = [];
    const methaneValues = [];
    
    try {
        if (document.getElementById('manual-gas-input').checked) {
            const inputs = document.querySelectorAll('#manual-gas-entries input');
            for (const input of inputs) {
                gasValues.push(parseFloat(input.value));
            }
        } else {
            const initialGas = parseFloat(document.getElementById('gas-volume').value);
            for (let i = 0; i < years; i++) {
                gasValues.push(initialGas * Math.pow(0.9, i));
            }
        }
        
        if (document.getElementById('manual-methane-input').checked) {
            const inputs = document.querySelectorAll('#manual-methane-entries input');
            for (const input of inputs) {
                methaneValues.push(parseFloat(input.value));
            }
        } else {
            const initialMethane = parseFloat(document.getElementById('methane-content').value);
            for (let i = 0; i < years; i++) {
                methaneValues.push(initialMethane * Math.pow(0.9, i));
            }
        }
        
        const profile = [];
        for (let i = 0; i < years; i++) {
            profile.push({
                Jahr: i + 1,
                Gasmenge: gasValues[i],
                Methangehalt: methaneValues[i]
            });
        }
        
        return profile;
    } catch (error) {
        alert("Fehler bei der Erstellung des Gasprofils: " + error.message);
        return null;
    }
}

// Motorauslastung für alle Motoren berechnen
function calculateEngineLoadForAll(yearData) {
    const results = [];
    const engines = dataFrames.engine_data;
    
    for (const engine of engines) {
        const load = calculateEngineLoad(yearData, engine);
        results.push({
            'Motorgröße [kWel]': engine['Engine Size [kWel]'],
            'Auslastung Jahr 1 [%]': load
        });
    }
    
    return results;
}

// Motorauslastung berechnen
function calculateEngineLoad(yearData, engineData) {
    const assumptions = dataFrames.assumptions;
    const methaneShare = yearData.Methangehalt / 100.0;
    const gasEnergy = (yearData.Gasmenge * methaneShare) * assumptions['Calorific Value CH4 [kWh/m^3]'];
    const dieselEnergy = engineData['Diesel Consumption [L/h]'] * assumptions['Calorific Value Diesel [kW/L]'];
    const totalEnergy = gasEnergy + dieselEnergy;
    const powerOutput = totalEnergy * (engineData['Engine efficency'] / 100.0);
    return (powerOutput / engineData['Engine Size [kWel]']) * 100.0;
}

// Besten Motor finden
function findBestEngine(engineLoads) {
    const engines = dataFrames.engine_data;
    const validEngines = [];
    
    for (let i = 0; i < engineLoads.length; i++) {
        const load = engineLoads[i]['Auslastung Jahr 1 [%]'];
        const engine = engines[i];
        
        if (load <= 100) {
            validEngines.push({
                ...engine,
                load_diff: 100 - load
            });
        }
    }
    
    if (validEngines.length === 0) return null;
    
    // Motor mit der geringsten Differenz zur 100% Auslastung finden
    validEngines.sort((a, b) => a.load_diff - b.load_diff);
    const bestEngine = {...validEngines[0]};
    delete bestEngine.load_diff;
    
    return bestEngine;
}

// Nächste Zeile in Daten finden
function findClosestRow(df, col, val) {
    let closest = null;
    let minDiff = Infinity;
    
    for (const row of df) {
        const diff = Math.abs(row[col] - val);
        if (diff < minDiff) {
            minDiff = diff;
            closest = row;
        }
    }
    
    return closest;
}

// Jährliche Umweltauswirkungen berechnen
function calculateYearlyImpacts(gasProfile, engine) {
    const assumptions = dataFrames.assumptions;
    const annualRuntime = assumptions['Annual runtime [h]'];
    const impactCategories = Object.keys(dataFrames.dual_fuel_impacts[Object.keys(dataFrames.dual_fuel_impacts)[0]]);
    
    const yearlyImpacts = {
        'Motorproduktion': {},
        'Ölverbrauch': {},
        'Dieselverbrauch': {},
        'Maintenance': {},
        'Emissionen': {}
    };
    
    const intermediateData = [];
    
    // Motorproduktion (einmalig im ersten Jahr)
    const prodFactor = engine['Production Factor'];
    const prodImpacts = dataFrames.dual_fuel_impacts['Engine Production'];
    yearlyImpacts['Motorproduktion'][1] = {};
    
    for (const category of impactCategories) {
        yearlyImpacts['Motorproduktion'][1][category] = prodFactor * (prodImpacts[category] || 0);
    }
    
    for (const yearData of gasProfile) {
        const year = yearData.Jahr;
        const engineLoad = calculateEngineLoad(yearData, engine);
        
        // Prüfen, ob Motor in diesem Jahr betrieben werden kann
        let status = 'In Betrieb';
        if (year === 1) {
            if (yearData.Gasmenge < engine['Min. volume flow [m^3/h]'] || 
                yearData.Gasmenge > engine['Max. volume flow [m^3/h]']) {
                alert(`In Jahr 1 liegt die Gasmenge (${yearData.Gasmenge.toFixed(1)} m³/h) außerhalb des Bereichs (${engine['Min. volume flow [m^3/h]']}-${engine['Max. volume flow [m^3/h]']} m³/h).`);
                return null;
            }
            
            if (engineLoad < engine['Minimum Engine Load']) {
                alert(`In Jahr 1 liegt die Motorauslastung (${engineLoad.toFixed(1)}%) unter dem Minimum von ${engine['Minimum Engine Load']}%.`);
                return null;
            }
        }
        
        if (yearData.Gasmenge < engine['Min. volume flow [m^3/h]'] || 
            yearData.Gasmenge > engine['Max. volume flow [m^3/h]'] || 
            engineLoad < engine['Minimum Engine Load']) {
            status = 'Außer Betrieb';
        }
        
        intermediateData.push({
            Jahr: year,
            Gasmenge: yearData.Gasmenge,
            Methangehalt: yearData.Methangehalt,
            'Motorauslastung [%]': engineLoad,
            Status: status
        });
        
        if (status === 'Außer Betrieb') continue;
        
        // Ölverbrauch
        const backgroundData = dataFrames.dual_fuel_background;
        const oilChangeRow = findClosestRow(backgroundData, 'Engine Load[%]', engineLoad);
        const oilChangeH = oilChangeRow['Oil change [opr. h]'];
        const yearlyOilL = (annualRuntime / oilChangeH) * engine['Oil tank volume'];
        
        yearlyImpacts['Ölverbrauch'][year] = {};
        const oilImpacts = dataFrames.dual_fuel_impacts['Operating Resources [1L oil]'];
        
        for (const category of impactCategories) {
            yearlyImpacts['Ölverbrauch'][year][category] = yearlyOilL * (oilImpacts[category] || 0);
        }
        
        // Dieselverbrauch
        const yearlyDieselL = engine['Diesel Consumption [L/h]'] * annualRuntime;
        yearlyImpacts['Dieselverbrauch'][year] = {};
        const dieselImpacts = dataFrames.dual_fuel_impacts['Fuel Consumption [1L Diesel]'];
        
        for (const category of impactCategories) {
            yearlyImpacts['Dieselverbrauch'][year][category] = yearlyDieselL * (dieselImpacts[category] || 0);
        }
        
        // Maintenance
        const maintRow = findClosestRow(backgroundData, 'Engine Load[%]', engineLoad);
        const maintH = maintRow['Maintenance Period [opr. h]'];
        const maintFactor = annualRuntime / maintH;
        yearlyImpacts['Maintenance'][year] = {};
        const maintImpacts = dataFrames.dual_fuel_impacts['Maintenance [filter production]'];
        
        for (const category of impactCategories) {
            yearlyImpacts['Maintenance'][year][category] = maintFactor * (maintImpacts[category] || 0);
        }
        
        // Emissionen
        const emissionsData = dataFrames.emissions;
        const emissionRatesRow = findClosestRow(emissionsData, 'Engine Range [% of Load]', engineLoad);
        const totalGasVolumeYear = yearData.Gasmenge * annualRuntime;
        
        yearlyImpacts['Emissionen'][year] = {};
        
        // Mapping zwischen Emissionsarten und Wirkungskategorien
        const emissionMapping = {
            'CO': 'CO Organic',
            'NOx': 'Nox',
            'Formldehyd': 'Formaldehyd',
            'CH4 slop': 'CH4',
            'Particulate Matter': 'Fine particulate matter formation'
        };
        
        for (const category of impactCategories) {
            yearlyImpacts['Emissionen'][year][category] = 0;
        }
        
        for (const [emissionCol, impactCategory] of Object.entries(emissionMapping)) {
            if (emissionRatesRow[emissionCol] !== undefined && dataFrames.emission_impacts[impactCategory]) {
                const emissionRate = parseFloat(emissionRatesRow[emissionCol]);
                const totalEmission = emissionRate * totalGasVolumeYear;
                const impactValues = dataFrames.emission_impacts[impactCategory];
                
                for (const category of impactCategories) {
                    if (impactValues[category] !== undefined) {
                        yearlyImpacts['Emissionen'][year][category] += totalEmission * impactValues[category];
                    }
                }
            }
        }
    }
    
    return {
        impacts: yearlyImpacts,
        intermediateData: intermediateData
    };
}

// Ergebnisse in Tabelle anzeigen
function displayTotalResultsTable(stageFilter) {
    const tableBody = document.querySelector('#results-table tbody');
    tableBody.innerHTML = '';
    
    if (!resultsData.total_impacts) return;
    
    let impacts;
    if (stageFilter === 'Gesamt') {
        impacts = {};
        for (const category of Object.keys(resultsData.total_impacts.Motorproduktion || {})) {
            impacts[category] = 0;
            for (const stage of Object.values(resultsData.total_impacts)) {
                impacts[category] += stage[category] || 0;
            }
        }
    } else {
        impacts = resultsData.total_impacts[stageFilter] || {};
    }
    
    for (const [category, value] of Object.entries(impacts)) {
        const row = document.createElement('tr');
        
        const categoryCell = document.createElement('td');
        categoryCell.textContent = category;
        
        const valueCell = document.createElement('td');
        valueCell.textContent = typeof value === 'number' ? value.toExponential(2) : value;
        
        row.appendChild(categoryCell);
        row.appendChild(valueCell);
        tableBody.appendChild(row);
    }
}

// Jährliche Daten anzeigen
function displayIntermediateYearlyData(data) {
    const tableHead = document.querySelector('#yearly-table thead');
    const tableBody = document.querySelector('#yearly-table tbody');
    
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    if (!data || data.length === 0) return;
    
    // Header erstellen
    const headerRow = document.createElement('tr');
    for (const key of Object.keys(data[0])) {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    }
    tableHead.appendChild(headerRow);
    
    // Datenzeilen erstellen
    for (const rowData of data) {
        const row = document.createElement('tr');
        for (const value of Object.values(rowData)) {
            const td = document.createElement('td');
            td.textContent = typeof value === 'number' ? value.toFixed(2) : value;
            row.appendChild(td);
        }
        tableBody.appendChild(row);
    }
}

// Motorauslastung anzeigen
function displayIntermediateEngineLoad(data) {
    const tableHead = document.querySelector('#engine-table thead');
    const tableBody = document.querySelector('#engine-table tbody');
    
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    if (!data || data.length === 0) return;
    
    // Header erstellen
    const headerRow = document.createElement('tr');
    for (const key of Object.keys(data[0])) {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    }
    tableHead.appendChild(headerRow);
    
    // Datenzeilen erstellen
    for (const rowData of data) {
        const row = document.createElement('tr');
        for (const value of Object.values(rowData)) {
            const td = document.createElement('td');
            td.textContent = typeof value === 'number' ? value.toFixed(2) : value;
            row.appendChild(td);
        }
        tableBody.appendChild(row);
    }
}

// Balkendiagramm aktualisieren
function updateBarChart() {
    const impactCategory = document.getElementById('impact-category').value;
    const ctx = document.getElementById('bar-chart').getContext('2d');
    
    if (barChart) {
        barChart.destroy();
    }
    
    if (!resultsData.total_impacts) return;
    
    const stages = Object.keys(resultsData.total_impacts);
    const values = stages.map(stage => resultsData.total_impacts[stage][impactCategory] || 0);
    
    // Farben für die Lebensphasen
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];
    
    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stages,
            datasets: [{
                label: impactCategory,
                data: values,
                backgroundColor: colors.slice(0, stages.length),
                borderColor: colors.slice(0, stages.length).map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: `Beiträge der Lebensphasen - ${impactCategory}`
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Auswirkung'
                    }
                }
            }
        }
    });
}

// Liniendiagramm aktualisieren
function updateLineChart() {
    const impactCategory = document.getElementById('line-impact-category').value;
    const stageFilter = document.getElementById('stage-dropdown').value;
    const ctx = document.getElementById('line-chart').getContext('2d');
    
    if (lineChart) {
        lineChart.destroy();
    }
    
    if (!resultsData.yearly_impacts) return;
    
    let data = [];
    let label = '';
    
    if (stageFilter === 'Gesamt') {
        // Gesamte Auswirkungen über alle Lebensphasen
        const years = Object.keys(resultsData.yearly_impacts[Object.keys(resultsData.yearly_impacts)[0]]);
        data = years.map(year => {
            let total = 0;
            for (const stage of Object.values(resultsData.yearly_impacts)) {
                total += (stage[year] && stage[year][impactCategory]) || 0;
            }
            return total;
        });
        label = 'Gesamt';
    } else {
        // Auswirkungen für eine bestimmte Lebensphase
        const stageData = resultsData.yearly_impacts[stageFilter];
        const years = Object.keys(stageData).sort((a, b) => a - b);
        data = years.map(year => stageData[year][impactCategory] || 0);
        label = stageFilter;
    }
    
    lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: data.length}, (_, i) => i + 1),
            datasets: [{
                label: `${label} - ${impactCategory}`,
                data: data,
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: `Zeitliche Entwicklung - ${impactCategory}`
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Auswirkung'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Betrachtungsjahr'
                    }
                }
            }
        }
    });
}