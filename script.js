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
    lineInputDiv.classList.add('lineInputDiv');
    lineInputDiv.setAttribute('data-line-id', lineCount); // 라인 ID 설정
    lineInputDiv.innerHTML = `
        <label>라인 ${lineCount}: </label>
        <input type="number" id="lineFloorCount${lineCount}" placeholder="몇 층까지" min="1">
        <button onclick="removeLine(${lineCount})">삭제</button>
    `;
    document.getElementById('lineInputsContainer').appendChild(lineInputDiv);
    lineData.push({ line: lineCount, floors: 0 });
});

// 라인 삭제 기능
function removeLine(lineId) {
    // 삭제하려는 라인의 요소를 찾고 제거
    const lineElement = document.querySelector(`.lineInputDiv[data-line-id='${lineId}']`);
    if (lineElement) {
        lineElement.remove();
    }

    // lineData 배열에서 해당 라인을 삭제
    lineData = lineData.filter(line => line.line !== lineId);
}

// 최종 동 추가 버튼 클릭 시 동호수표 생성
document.getElementById('addFinalBuildingBtn').addEventListener('click', function () {
    const buildingNumber = document.getElementById('buildingNumber').value;
    if (!buildingNumber) {
        alert('동 번호를 입력하세요.');
        return;
    }

    lineData = lineData.map((line, index) => {
        const floors = document.getElementById(`lineFloorCount${line.line}`).value;
        return { line: line.line, floors: floors ? parseInt(floors) : 0 };
    });

    createBuilding(buildingNumber, lineData);
    document.getElementById('buildingFormContainer').classList.add('hidden');
    lineData = []; // 데이터 초기화
    lineCount = 0; // 라인 카운트 초기화
    document.getElementById('lineInputsContainer').innerHTML = ''; // 폼 초기화
});

// 동호수표 생성 함수
let buildingData = [];

function createBuilding(buildingNumber, lines) {
    const buildingContainer = document.getElementById('buildingContainer');

    // 새로운 동을 가로로 정렬하여 추가
    const newBuilding = document.createElement('div');
    newBuilding.classList.add('building');
    newBuilding.style.display = 'inline-block'; // 동을 가로로 정렬
    newBuilding.style.margin = '10px'; // 동 사이 간격

    const buildingFloors = [];
    const maxFloors = Math.max(...lines.map(line => line.floors));

    // 동 이름 표시
    const buildingHeader = document.createElement('h3');
    buildingHeader.innerText = `${buildingNumber}동`;
    newBuilding.appendChild(buildingHeader);

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
        newBuilding.appendChild(lineContainer);
    }

    buildingContainer.appendChild(newBuilding); // 새로운 동을 전체 컨테이너에 추가
    buildingData.push({ building: buildingNumber, rooms: buildingFloors });
}

// 엑셀 내보내기
document.getElementById('exportExcelBtn').addEventListener('click', function () {
    exportToExcel();
});

function exportToExcel() {
    const ws_data = [["동", "라인", "호수", "층간소음"]]; // 엑셀 시트의 헤더

    // 모든 동의 정보를 하나의 시트에 추가
    buildingData.forEach(building => {
        building.rooms.forEach(room => {
            ws_data.push([building.building, room.line, room.room, ""]);
        });
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '동호수표'); // 하나의 시트에 모든 데이터를 추가
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
    // 여러 동을 처리하기 위해 groupedByBuilding을 만듭니다.
    const groupedByBuilding = {};

    data.forEach(apartment => {
        const building = apartment['동'];
        if (!groupedByBuilding[building]) {
            groupedByBuilding[building] = [];
        }
        groupedByBuilding[building].push(apartment);
    });

    // 각 동에 대해 renderApartments를 호출하여 동호수표 형식으로 보기 생성
    renderApartments(groupedByBuilding);

    // 분포표 형식 결과 생성
    processDistributionData(data);

    // 결과보기 탭 활성화
    document.getElementById('resultTabs').classList.remove('hidden');
}

// 동호수표 형식으로 보기
function renderApartments(groupedData) {
    const container = document.getElementById('apartment-container');
    container.innerHTML = ''; // 기존 내용을 지우기

    // 동을 가로로 배치하기 위해 container의 display 속성을 'flex'로 설정
    container.style.display = 'flex';
    container.style.flexWrap = 'wrap'; // 동이 많을 경우 줄 바꿈을 허용
    container.style.gap = '20px'; // 동 간의 간격 설정

    // 각 동을 반복하며 동호수표를 생성
    for (const building in groupedData) {
        const apartments = groupedData[building];
        const maxFloors = Math.max(...apartments.map(a => parseInt(a['호수'].slice(0, -1) / 100)));
        const lines = [...new Set(apartments.map(a => a['라인']))].sort();

        const newBuilding = document.createElement('div');
        newBuilding.classList.add('building');
        newBuilding.style.display = 'inline-block'; // 동을 가로로 정렬
        newBuilding.style.margin = '10px'; // 동 사이 간격

        // 동 이름 표시
        const buildingHeader = document.createElement('h3');
        buildingHeader.innerText = `${building}동`;
        newBuilding.appendChild(buildingHeader);

        // 아파트 구조 생성 (아래에서 위로 층을 표시)
        for (let floor = maxFloors; floor >= 1; floor--) {
            const lineContainer = document.createElement('div');
            lineContainer.classList.add('line');

            lines.forEach(line => {
                const roomDiv = document.createElement('div');
                roomDiv.classList.add('room');

                // 현재 라인과 층에 해당하는 아파트 찾기
                const apartment = apartments.find(a => a['라인'] == line && parseInt(a['호수'].slice(0, -1) / 100) === floor);

                if (apartment) {
                    const noiseLevel = apartment['층간소음'] || apartment['db'];
                    const noiseClass = noiseLevel >= 55 ? 'high' : 'low'; // 기준에 따라 색상 지정
                    roomDiv.classList.add(noiseClass);
                    roomDiv.innerHTML = `<p>${apartment['호수']}</p><p>Noise: ${noiseLevel}</p>`;
                }
                lineContainer.appendChild(roomDiv);
            });
            newBuilding.appendChild(lineContainer);
        }

        container.appendChild(newBuilding); // 동을 컨테이너에 추가
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
