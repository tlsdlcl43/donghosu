// 탭 전환 함수
function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none"; // 모든 탭 숨기기
    }

    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", ""); // 활성화된 탭 클래스 제거
    }

    document.getElementById(tabName).style.display = "block"; // 선택된 탭 표시
    evt.currentTarget.className += " active"; // 탭 활성화
}

// 결과보기 탭 전환 함수
function openResultTab(evt, resultTabName) {
    const resultContent = document.getElementsByClassName("resultContent");
    for (let i = 0; i < resultContent.length; i++) {
        resultContent[i].style.display = "none"; // 모든 결과 보기 콘텐츠 숨기기
    }

    document.getElementById(resultTabName).style.display = "block"; // 선택된 결과 보기 콘텐츠 표시
    evt.currentTarget.className += " active";
}

// 초기 탭 설정
document.addEventListener('DOMContentLoaded', function () {
    document.querySelector('.tablinks').click();
});

// 동호수표 생성 관련 코드
document.getElementById('addBuildingBtn').addEventListener('click', function () {
    document.getElementById('buildingFormContainer').classList.remove('hidden');
});

let lineCount = 0;
let lineData = [];

document.getElementById('addLineBtn').addEventListener('click', function () {
    lineCount++;
    const lineInputDiv = document.createElement('div');
    lineInputDiv.innerHTML = `
        <label>라인 ${lineCount}: </label>
        <input type="number" id="lineFloorCount${lineCount}" placeholder="몇 층까지" min="1">
    `;
    document.getElementById('lineInputsContainer').appendChild(lineInputDiv);
    lineData.push({ line: lineCount, floors: 0 });
});

// 최종 동 추가 버튼 클릭 시 동호수표 생성
document.getElementById('addFinalBuildingBtn').addEventListener('click', function () {
    const buildingNumber = document.getElementById('buildingNumber').value;
    if (!buildingNumber) {
        alert('동 번호를 입력하세요.');
        return;
    }

    lineData = lineData.map((line, index) => {
        const floors = document.getElementById(`lineFloorCount${index + 1}`).value;
        return { line: line.line, floors: floors ? parseInt(floors) : 0 };
    });

    createBuilding(buildingNumber, lineData);
    document.getElementById('buildingFormContainer').classList.add('hidden');
    lineData = []; // 데이터 초기화
    lineCount = 0; // 라인 카운트 초기화
});

// 동호수표 생성 함수
let buildingData = [];

function createBuilding(buildingNumber, lines) {
    const buildingContainer = document.getElementById('buildingContainer');
    buildingContainer.innerHTML = ""; // 기존 내용 삭제
    const buildingFloors = [];
    const maxFloors = Math.max(...lines.map(line => line.floors));

    // 동 이름 표시
    const buildingHeader = document.createElement('h3');
    buildingHeader.innerText = `${buildingNumber}동`;
    buildingContainer.appendChild(buildingHeader);

    for (let floor = maxFloors; floor >= 1; floor--) {
        const lineContainer = document.createElement('div');
        lineContainer.classList.add('line');

        lines.forEach(line => {
            const roomDiv = document.createElement('div');
            roomDiv.classList.add('room');

            if (floor <= line.floors) {
                const roomNumber = `${floor * 100 + line.line}호`;
                roomDiv.innerText = roomNumber;
                buildingFloors.push({ building: buildingNumber, line: line.line, floor: floor, room: roomNumber });
            }
            lineContainer.appendChild(roomDiv);
        });
        buildingContainer.appendChild(lineContainer);
    }

    buildingData.push({ building: buildingNumber, rooms: buildingFloors });
}

// 엑셀 내보내기
document.getElementById('exportExcelBtn').addEventListener('click', function () {
    exportToExcel();
});

function exportToExcel() {
    const wb = XLSX.utils.book_new();

    buildingData.forEach(building => {
        const ws_data = [["동", "라인", "호수", "층간소음"]];
        building.rooms.forEach(room => {
            ws_data.push([building.building, room.line, room.room, ""]);
        });
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, `${building.building}동`);
    });

    XLSX.writeFile(wb, '동호수표.xlsx');
}

// 엑셀 업로드 및 결과 처리
document.getElementById('uploadFileBtn').addEventListener('click', function () {
    const fileInput = document.getElementById('fileUpload').files[0];
    if (!fileInput) {
        alert('엑셀 파일을 업로드하세요.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        processAndRenderResults(jsonData);
    };
    reader.readAsArrayBuffer(fileInput);
});

// 엑셀 데이터를 처리하여 동호수표와 분포표 결과 보기
function processAndRenderResults(data) {
    // "층간소음"이나 "db" 데이터를 올바르게 읽도록 처리
    data.forEach(apartment => {
        apartment.층간소음 = apartment['층간소음'] || apartment['db'];
    });

    // 동호수표 형식 보기 및 분포표 형식 보기 탭 활성화
    document.getElementById('resultTabs').classList.remove('hidden');

    // 동호수표 형식 결과 생성
    renderApartments(data);

    // 분포표 형식 결과 생성
    processDistributionData(data);
}

// 동호수표 형식으로 보기
function renderApartments(data) {
    const container = document.getElementById('apartment-container');
    container.innerHTML = ''; // 기존 내용을 지우기

    // 라인별로 아파트 데이터를 그룹화
    const groupedByLine = {};
    data.forEach(apartment => {
        const line = apartment['라인'];
        const floor = parseInt(apartment['호수'].slice(0, -1) / 100); // 호수에서 층 번호 추출

        if (!groupedByLine[line]) {
            groupedByLine[line] = {};
        }
        if (!groupedByLine[line][floor]) {
            groupedByLine[line][floor] = [];
        }
        groupedByLine[line][floor].push(apartment);
    });

    // 최대 층을 계산하여 아파트 구조를 아래에서 위로 표시
    const maxFloors = Math.max(...data.map(apartment => parseInt(apartment['호수'].slice(0, -1) / 100)));
    const lines = Object.keys(groupedByLine).sort(); // 라인 정렬

    for (let floor = maxFloors; floor >= 1; floor--) {
        const lineContainer = document.createElement('div');
        lineContainer.classList.add('line');

        lines.forEach(line => {
            const roomDiv = document.createElement('div');
            roomDiv.classList.add('room');

            const apartment = groupedByLine[line][floor] ? groupedByLine[line][floor][0] : null;
            if (apartment) {
                const noiseLevel = apartment['층간소음'];
                const noiseClass = noiseLevel >= 55 ? 'high' : 'low'; // 기준에 따라 색상 지정
                roomDiv.classList.add(noiseClass);
                roomDiv.innerHTML = `<p>${apartment['호수']}</p><p>Noise: ${noiseLevel}</p>`;
            }
            lineContainer.appendChild(roomDiv);
        });

        container.appendChild(lineContainer);
    }
}

// 분포표 형식으로 보기 - 데이터를 처리하고 히스토그램과 테이블 생성
function processDistributionData(data) {
    const dbValues = data.map(item => item['층간소음'] || item['db']);
    const sortedDb = [...dbValues].sort((a, b) => a - b);
    const dbCount = sortedDb.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});

    const top15Threshold = sortedDb[Math.floor(dbValues.length * 0.85)]; // 상위 15% 기준

    // 히스토그램 생성
    const ctx = document.getElementById('dbChart').getContext('2d');
    const chartData = {
        labels: Object.keys(dbCount),
        datasets: [{
            label: 'Number of Units',
            data: Object.values(dbCount),
            backgroundColor: Object.keys(dbCount).map(db => db >= top15Threshold ? 'red' : 'blue')
        }]
    };

    new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'DB'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Units'
                    }
                }
            }
        }
    });

    // 분포표 테이블 생성
    createDistributionTable(data, top15Threshold);
}

function createDistributionTable(data, top15Threshold) {
    const table = document.getElementById('data-table');
    table.innerHTML = ''; // 기존 테이블 내용 제거

    // 테이블 헤더 생성
    const header = table.insertRow();
    ['동', '라인', '호수', 'DB', '위험군'].forEach(text => {
        const th = document.createElement('th');
        th.appendChild(document.createTextNode(text));
        header.appendChild(th);
    });

    // 테이블 데이터 행 생성
    data.forEach(item => {
        const row = table.insertRow();
        row.insertCell(0).appendChild(document.createTextNode(item['동']));
        row.insertCell(1).appendChild(document.createTextNode(item['라인']));
        row.insertCell(2).appendChild(document.createTextNode(item['호수']));
        row.insertCell(3).appendChild(document.createTextNode(item['층간소음'] || item['db']));

        // 위험군 표시
        const riskCell = row.insertCell(4);
        if (item['층간소음'] >= top15Threshold) {
            riskCell.appendChild(document.createTextNode('위험군'));
            row.classList.add('risk');
        } else {
            riskCell.appendChild(document.createTextNode('-'));
        }
    });
}
