let allData = [];
let filteredData = [];
let currentPage = 1;
let recordsPerPage = 10;
let sortColumn = null;
let sortDirection = 'asc';

// CSV 파일 로드 - Jekyll 환경에 맞게 수정
async function loadCSV() {
    try {
        // CSV 파일 경로 설정
        const response = await fetch('data/vla_data.csv');
        const text = await response.text();
        
        // Papa Parse로 CSV 파싱
        const result = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
        });
        
        if (result.errors.length > 0) {
            console.error('CSV parsing errors:', result.errors);
        }
        
        allData = result.data;
        
        // 카테고리 우선순위에 따라 정렬
        const categoryOrder = ['Review', 'End-to-End', '3D', 'Planning', 'Policy', 'Special'];
        allData.sort((a, b) => {
            const aCat = (a['カテゴリ'] || '').split(',')[0].trim();
            const bCat = (b['カテゴリ'] || '').split(',')[0].trim();
            
            const aIndex = categoryOrder.indexOf(aCat);
            const bIndex = categoryOrder.indexOf(bCat);
            
            // 우선순위에 있는 카테고리가 먼저 오도록
            if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex;
            } else if (aIndex !== -1) {
                return -1;
            } else if (bIndex !== -1) {
                return 1;
            }
            
            // 우선순위에 없는 카테고리는 알파벳 순
            return aCat.localeCompare(bCat);
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

// 필터 옵션 채우기
function populateFilters() {
    const uniqueValues = (field) => {
        return [...new Set(allData.flatMap(row =>
            (row[field] || '').split(',').map(value => value.trim()).filter(Boolean)
        ))];
    };
    
    const challengeTags = uniqueValues('Challenge Tag');
    const subChallengeTags = uniqueValues('Sub-Challeng Tag');
    const solutionTags = uniqueValues('How to Solve');
    const trainingTypes = uniqueValues('Training Type');
    const datasets = uniqueValues('Dataset');
    const evaluations = uniqueValues('Evaluation');
    
    populateSelect('challengeFilter', challengeTags);
    populateSelect('subChallengeFilter', subChallengeTags);
    populateSelect('solutionFilter', solutionTags);
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

// 태그 클래스 생성 함수
function getTagClass(type, value) {
    const normalizedValue = value.toLowerCase().replace(/[\s-]/g, '-');
    return `tag tag-${type}-${normalizedValue}`;
}

// 검색어 하이라이트 함수
function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm || searchTerm.length < 2) return text;
    
    // HTML 엔티티 이스케이프
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    
    // 정규식 특수문자 이스케이프
    const escapeRegExp = (str) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    const safeText = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return safeText.replace(regex, '<mark>$1</mark>');
}

// 테이블 업데이트
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
        const renderTagCell = (field, type) => {
            const values = (row[field] || '').split(',').map(value => value.trim()).filter(Boolean);
            if (values.length === 0) return '-';
            return values.map(value => {
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
        
        // Challenge Tag
        tr.innerHTML += `<td>${renderTagCell('Challenge Tag', 'challenge')}</td>`;

        // Sub-Challeng Tag
        tr.innerHTML += `<td>${renderTagCell('Sub-Challeng Tag', 'subchallenge')}</td>`;
        
        // How to Solve
        tr.innerHTML += `<td>${renderTagCell('How to Solve', 'solution')}</td>`;
        
        // Training Type
        tr.innerHTML += `<td>${renderTagCell('Training Type', 'training')}</td>`;
        
        // Dataset
        tr.innerHTML += `<td>${renderTagCell('Dataset', 'dataset')}</td>`;
        
        // Evaluation
        tr.innerHTML += `<td>${renderTagCell('Evaluation', 'evaluation')}</td>`;
        
        tbody.appendChild(tr);
    });
}

// 검색 점수 계산
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

// 필터링
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const challengeFilter = document.getElementById('challengeFilter').value;
    const subChallengeFilter = document.getElementById('subChallengeFilter').value;
    const solutionFilter = document.getElementById('solutionFilter').value;
    const trainingFilter = document.getElementById('trainingFilter').value;
    const datasetFilter = document.getElementById('datasetFilter').value;
    const evaluationFilter = document.getElementById('evaluationFilter').value;
    
    const results = allData.map(row => {
        const includesValue = (value, target) => (value || '').split(',').map(v => v.trim()).filter(Boolean).includes(target);
        
        if (challengeFilter && !includesValue(row['Challenge Tag'], challengeFilter)) return null;
        if (subChallengeFilter && !includesValue(row['Sub-Challeng Tag'], subChallengeFilter)) return null;
        if (solutionFilter && !includesValue(row['How to Solve'], solutionFilter)) return null;
        if (trainingFilter && !includesValue(row['Training Type'], trainingFilter)) return null;
        if (datasetFilter && !includesValue(row['Dataset'], datasetFilter)) return null;
        if (evaluationFilter && !includesValue(row['Evaluation'], evaluationFilter)) return null;
        
        // 검색어 매칭 및 점수 계산
        if (searchTerm) {
            const score = calculateSearchScore(searchTerm, row);
            if (score === 0) {
                // 점수가 0이면 일반 검색
                const searchMatch = Object.values(row).some(value => 
                    String(value).toLowerCase().includes(searchTerm)
                );
                if (!searchMatch) return null;
            }
            return { row, score };
        }
        
        return { row, score: 0 };
    }).filter(item => item !== null);
    
    // 점수 기반 정렬
    if (searchTerm && results.some(item => item.score > 0)) {
        results.sort((a, b) => b.score - a.score);
    }
    
    filteredData = results.map(item => item.row);
    
    currentPage = 1;
    updateTable();
    updatePagination();
}

// 정렬
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

// 페이지네이션 업데이트
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

// 페이지 변경
function changePage(newPage) {
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        updateTable();
        updatePagination();
    }
}

// 필터 초기화
function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('challengeFilter').value = '';
    document.getElementById('subChallengeFilter').value = '';
    document.getElementById('solutionFilter').value = '';
    document.getElementById('trainingFilter').value = '';
    document.getElementById('datasetFilter').value = '';
    document.getElementById('evaluationFilter').value = '';
    applyFilters();
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function() {
    loadCSV();
    
    // 필터 이벤트
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('challengeFilter').addEventListener('change', applyFilters);
    document.getElementById('subChallengeFilter').addEventListener('change', applyFilters);
    document.getElementById('solutionFilter').addEventListener('change', applyFilters);
    document.getElementById('trainingFilter').addEventListener('change', applyFilters);
    document.getElementById('datasetFilter').addEventListener('change', applyFilters);
    document.getElementById('evaluationFilter').addEventListener('change', applyFilters);
    
    // 정렬 이벤트
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => sortTable(parseInt(th.dataset.column)));
    });
    
    // 페이지네이션 이벤트
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
