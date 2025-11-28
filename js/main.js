let allData = [];
let filteredData = [];
let currentPage = 1;
let recordsPerPage = 10;
let sortColumn = null;
let sortDirection = 'asc';

// Load CSV file
async function loadCSV() {
    try {
        // Set CSV file path
        const response = await fetch('data/vla_data.csv');
        const text = await response.text();
        
        // Parse CSV with Papa Parse
        const result = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
        });
        
        if (result.errors.length > 0) {
            console.error('CSV parsing errors:', result.errors);
        }
        
        allData = result.data;
        
        // Filter out any empty rows that might have been created
        allData = allData.filter(row => row['略称'] && row['略称'].trim() !== '');
        
        // Sort by Year (newest first) as default
        allData.sort((a, b) => {
            const yearA = parseInt(a['Year'] || 0);
            const yearB = parseInt(b['Year'] || 0);
            return yearB - yearA; // Descending order (newest first)
        });
        
        filteredData = [...allData];
        
        populateFilters();
        updateTable();
        updatePagination();
    } catch (error) {
        console.error('Error loading CSV:', error);
        document.getElementById('tableBody').innerHTML = 
            '<tr><td colspan="9" class="loading">Error loading CSV file. Please ensure vla_data.csv is in the data directory.</td></tr>';
    }
}

// Populate filter options
function populateFilters() {
    const uniqueValues = (field) => {
        const separator = (field === 'Challenge Tag' || field === 'Sub-Challeng Tag' || field === 'Dataset' || field === 'Evaluation') ? /;/ : /,/;
        return [...new Set(allData.flatMap(row =>
            (row[field] || '').split(separator).map(value => value.trim()).filter(Boolean)
        ))];
    };
    
    const challengeTags = uniqueValues('Challenge Tag');
    const subChallengeTags = uniqueValues('Sub-Challeng Tag');
    const trainingTypes = uniqueValues('Training Type');
    const datasets = uniqueValues('Dataset');
    const evaluations = uniqueValues('Evaluation');
    
    populateSelect('challengeFilter', challengeTags);
    populateSelect('subChallengeFilter', subChallengeTags);
    populateSelect('trainingFilter', trainingTypes);
    populateSelect('datasetFilter', datasets);
    populateSelect('evaluationFilter', evaluations);
}

function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">All</option>';
    options.sort().forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
}
// Generate a stable HSL color based on a string
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360; // 0–359
    const saturation = 55; // moderate saturation
    const lightness = 68; // soft appearance

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Generate tag class function
function getTagClass(type, value) {
    if (!value) return 'tag tag-default';
    const lowerValue = value.toLowerCase().trim();
    
    if (type === 'challenge') {
        if (lowerValue.includes('fusion') || lowerValue.includes('representation')) return 'tag tag-challenge-fusion';
        if (lowerValue.includes('execution') || lowerValue.includes('complex')) return 'tag tag-challenge-execution';
        if (lowerValue.includes('generalization') || lowerValue.includes('learning')) return 'tag tag-challenge-generalization';
        if (lowerValue.includes('security') || lowerValue.includes('reliable')) return 'tag tag-challenge-security';
        if (lowerValue.includes('dataset') || lowerValue.includes('benchmarking')) return 'tag tag-challenge-dataset';
    }
    if (type === 'dataset') {
        return `tag tag-auto" style="background-color:${stringToColor(value)}; color:#000;`;
    }
    if (type === 'evaluation') {
        return `tag tag-auto" style="background-color:${stringToColor(value)}; color:#000;`;
    }
    if (type === 'dataset-eval') {
        return 'tag tag-dataset-eval';
    }
    if (type === 'default') {
        return 'tag tag-default';
    }
    
    const normalizedValue = value.toLowerCase().replace(/[\s-]/g, '-');
    return `tag tag-${type}-${normalizedValue}`;
}

// Highlight search term function
function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm || searchTerm.length < 2) return text;
    
    // Escape HTML entities
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    
    // Escape regex special characters
    const escapeRegExp = (str) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    const safeText = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return safeText.replace(regex, '<mark>$1</mark>');
}

// Update table
function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    const searchTerm = document.getElementById('searchInput').value.trim();
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageData = filteredData.slice(start, end);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No data found</td></tr>';
        return;
    }
    
    pageData.forEach(row => {
        const tr = document.createElement('tr');
        const renderTagCell = (field, type, separator = ',') => {
            const values = (row[field] || '').split(separator).map(value => value.trim()).filter(Boolean);
            if (values.length === 0) return '-';
            return values.map((value) => {
                const highlighted = searchTerm ? highlightSearchTerm(value, searchTerm) : value;
                return `<span class="${getTagClass(type, value)}">${highlighted}</span>`;
            }).join(' ');
        };
        
        // Abbreviation
        const abbreviation = row['略称'] || '';
        const abbreviationContent = abbreviation ? (searchTerm ? highlightSearchTerm(abbreviation, searchTerm) : abbreviation) : '-';
        tr.innerHTML += `<td><strong>${abbreviationContent}</strong></td>`;
        
        // Year
        const yearValue = row['Year'] || '';
        const yearContent = yearValue ? (searchTerm ? highlightSearchTerm(String(yearValue), searchTerm) : yearValue) : '-';
        tr.innerHTML += `<td>${yearContent}</td>`;
        
        // Links
        const paperUrl = row['Paper URL'] || '';
        const websiteUrl = row['Website URL'] || '';
        let linkContent = '';
        if (paperUrl) {
            linkContent += `<a href="${paperUrl}" target="_blank" class="link mr-2">Paper</a>`;
        }
        if (websiteUrl) {
            linkContent += `<a href="${websiteUrl}" target="_blank" class="link">Website</a>`;
        }
        tr.innerHTML += `<td>${linkContent || '-'}</td>`;
        
        // Challenge Tag & Sub-Challeng Tag (paired bubbles)
        const rawChallenge = row['Challenge Tag'] || '';
        const rawSubChallenge = row['Sub-Challeng Tag'] || '';
        const challengeTags = rawChallenge.split(';').map(v => v.trim()).filter(Boolean);
        const subChallenges = rawSubChallenge.split(';').map(v => v.trim()).filter(Boolean);
        
        // Challenge Tag cell
        let challengeHtml = '-';
        if (challengeTags.length > 0) {
            challengeHtml = challengeTags.map(tag => {
                const highlighted = searchTerm ? highlightSearchTerm(tag, searchTerm) : tag;
                const cls = getTagClass('challenge', tag);
                return `<span class="${cls}">${highlighted}</span>`;
            }).join(' ');
        }
        tr.innerHTML += `<td>${challengeHtml}</td>`;

        // Sub-Challeng Tag cell
        let subHtml = '-';
        if (challengeTags.length > 1 && subChallenges.length > 0) {
            const pairs = challengeTags.map((tag, idx) => {
                const subText = subChallenges[idx] || '';
                if (!subText) return '';
                const highlightedSub = searchTerm ? highlightSearchTerm(subText, searchTerm) : subText;
                const cls = getTagClass('challenge', tag); // same color as its challenge tag
                return `<span class="${cls}">${highlightedSub}</span>`;
            }).filter(Boolean);
            if (pairs.length > 0) {
                subHtml = pairs.join(' ');
            }
        } else {
            const singleSub = rawSubChallenge.trim();
            if (singleSub) {
                subHtml = searchTerm ? highlightSearchTerm(singleSub, searchTerm) : singleSub;
            }
        }
        tr.innerHTML += `<td>${subHtml}</td>`;
        
        // How to Solve
        tr.innerHTML += `<td>${renderTagCell('How to Solve', 'solution')}</td>`;
        
        // Training Type
        tr.innerHTML += `<td>${renderTagCell('Training Type', 'training')}</td>`;
        
        // Dataset (use ';' and single neutral bubble color)
        tr.innerHTML += `<td>${renderTagCell('Dataset', 'dataset', ';')}</td>`;
        
        // Evaluation (use ';' and single neutral bubble color)
        tr.innerHTML += `<td>${renderTagCell('Evaluation', 'evaluation', ';')}</td>`;
        
        tbody.appendChild(tr);
    });
}

// Calculate search score
function calculateSearchScore(searchTerm, row) {
    const fieldWeights = {
        '略称': 10,
        'Year': 6,
        'Challenge Tag': 8,
        'Sub-Challeng Tag': 7,
        'How to Solve': 7,
        'Training Type': 5,
        'Dataset': 4,
        'Evaluation': 4
    };
    
    let score = 0;
    const searchLower = searchTerm.toLowerCase();
    
    for (const [field, value] of Object.entries(row)) {
        if (!value) continue;
        
        const valueLower = String(value).toLowerCase();
        const weight = fieldWeights[field] || 1;
        
        if (valueLower === searchLower) {
            score += weight * 10;
        } else if (valueLower.split(/\s+/).some(word => word.startsWith(searchLower))) {
            score += weight * 5;
        } else if (valueLower.includes(searchLower)) {
            score += weight * 2;
        }
    }
    
    return score;
}


function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const challengeFilter = document.getElementById('challengeFilter').value;
    const subChallengeFilter = document.getElementById('subChallengeFilter').value;
    const trainingFilter = document.getElementById('trainingFilter').value;
    const datasetFilter = document.getElementById('datasetFilter').value;
    const evaluationFilter = document.getElementById('evaluationFilter').value;
    
    const results = allData.map(row => {
        const includesValue = (value, target, field) => {
            const separator = (field === 'Challenge Tag' || field === 'Sub-Challeng Tag' || field === 'Dataset' || field === 'Evaluation') ? /;/ : /,/;
            return (value || '').split(separator).map(v => v.trim()).filter(Boolean).includes(target);
        };
        
        if (challengeFilter && !includesValue(row['Challenge Tag'], challengeFilter, 'Challenge Tag')) return null;
        if (subChallengeFilter && !includesValue(row['Sub-Challeng Tag'], subChallengeFilter, 'Sub-Challeng Tag')) return null;
        if (trainingFilter && !includesValue(row['Training Type'], trainingFilter)) return null;
        if (datasetFilter && !includesValue(row['Dataset'], datasetFilter)) return null;
        if (evaluationFilter && !includesValue(row['Evaluation'], evaluationFilter)) return null;
        
        // Search term matching and score calculation
        if (searchTerm) {
            const score = calculateSearchScore(searchTerm, row);
            if (score === 0) {
                // If score is 0, perform general search
                const searchMatch = Object.values(row).some(value => 
                    String(value).toLowerCase().includes(searchTerm)
                );
                if (!searchMatch) return null;
            }
            return { row, score };
        }
        
        return { row, score: 0 };
    }).filter(item => item !== null);
    

    if (searchTerm && results.some(item => item.score > 0)) {
        results.sort((a, b) => b.score - a.score);
    }
    
    filteredData = results.map(item => item.row);
    
    currentPage = 1;
    updateTable();
    updatePagination();
}


function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    const columnMap = {
        0: '略称',
        1: 'Year',
        3: 'Challenge Tag',
        4: 'Sub-Challeng Tag',
        5: 'How to Solve',
        6: 'Training Type',
        7: 'Dataset',
        8: 'Evaluation'
    };
    
    const key = columnMap[column];
    
    filteredData.sort((a, b) => {
        let aVal = a[key] || '';
        let bVal = b[key] || '';
        
        if (['Challenge Tag', 'Sub-Challeng Tag', 'How to Solve', 'Training Type', 'Dataset', 'Evaluation'].includes(key)) {
            aVal = aVal.split(',')[0].trim() || '';
            bVal = bVal.split(',')[0].trim() || '';
        }
        
        if (sortDirection === 'asc') {
            return aVal.localeCompare(bVal);
        } else {
            return bVal.localeCompare(aVal);
        }
    });
    
    // Update sort indicators
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    const currentTh = document.querySelector(`th[data-column="${column}"]`);
    if (currentTh) {
        currentTh.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
    
    updateTable();
}

function updatePagination() {
    const totalRecords = filteredData.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const start = totalRecords > 0 ? (currentPage - 1) * recordsPerPage + 1 : 0;
    const end = Math.min(currentPage * recordsPerPage, totalRecords);
    
    document.getElementById('startRecord').textContent = start;
    document.getElementById('endRecord').textContent = end;
    document.getElementById('totalRecords').textContent = totalRecords;
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages || 1;
    
    document.getElementById('firstPage').disabled = currentPage === 1;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
    document.getElementById('lastPage').disabled = currentPage >= totalPages;
}

// Change page
function changePage(newPage) {
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        updateTable();
        updatePagination();
    }
}

// Clear all filters
function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('challengeFilter').value = '';
    document.getElementById('subChallengeFilter').value = '';
    document.getElementById('trainingFilter').value = '';
    document.getElementById('datasetFilter').value = '';
    document.getElementById('evaluationFilter').value = '';
    applyFilters();
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', function() {
    loadCSV();
    
    // Filter events
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('challengeFilter').addEventListener('change', applyFilters);
    document.getElementById('subChallengeFilter').addEventListener('change', applyFilters);
    document.getElementById('trainingFilter').addEventListener('change', applyFilters);
    document.getElementById('datasetFilter').addEventListener('change', applyFilters);
    document.getElementById('evaluationFilter').addEventListener('change', applyFilters);
    
    // Sort events
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => sortTable(parseInt(th.dataset.column)));
    });
    
    // Pagination events
    document.getElementById('firstPage').addEventListener('click', () => changePage(1));
    document.getElementById('prevPage').addEventListener('click', () => changePage(currentPage - 1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(currentPage + 1));
    document.getElementById('lastPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / recordsPerPage);
        changePage(totalPages);
    });
    
    document.getElementById('recordsPerPage').addEventListener('change', (e) => {
        recordsPerPage = parseInt(e.target.value);
        currentPage = 1;
        updateTable();
        updatePagination();
    });
});
