// Классы
class User {
    constructor(username, password, role, details) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.details = details;
        this.marks = {};
        this.subjects = {};
    }
}

class Student extends User {
    constructor(username, password, fullName, group, studentId) {
        super(username, password, 'student', { fullName, group, studentId });
    }

    calculateAverageGrade(gradesData) {
        let totalGrades = 0;
        let totalSubjects = 0;
        for (const semester in gradesData) {
            for (const subject in gradesData[semester]) {
                const grade = gradesData[semester][subject];
                if (typeof grade === 'number') {
                    totalGrades += grade;
                    totalSubjects++;
                }
            }
        }
        return totalSubjects > 0 ? (totalGrades / totalSubjects).toFixed(2) : 'Нет оценок';
    }
}

class Teacher extends User {
    constructor(username, password, details) {
        super(username, password, 'teacher', details);
    }
}

// Данные юзеров
let users = [
    new User("Prepodavatel", "1111", "teacher", { fullName: "Котиков Никита Михайлович" }),
    new User("Lebed", "2222", "student", { fullName: "Лебедь Дмитрий Ивановичъ", group: "БСБО-01-22", studentId: "22Б0090" }),
    new User("Grafskov", "3333", "student", { fullName: "Графсков Федор Сергеевич", group: "БСБО-01-22", studentId: "22Б0067" }),
    new User("Chernushov", "4444", "student", { fullName: "Чушпанов Димитрий Дмитриевич", group: "БСБО-01-22", studentId: "22БВГДЕ" }),
];

// Функции 
function getUsersData() {
    return JSON.parse(localStorage.getItem('users')) || users;
}

function saveUsersData(data) {
    localStorage.setItem('users', JSON.stringify(data));
    users = data;
}

const storedUsers = getUsersData();
if (storedUsers) {
    users = storedUsers;
}

function getGradesData() {
    return JSON.parse(localStorage.getItem('grades')) || initializeGradesData();
}

function saveGradesData(data) {
    localStorage.setItem('grades', JSON.stringify(data));
}

function initializeGradesData() {
    const initialData = {};
    const subjects = ['Математика', 'Информатика', 'Физика', 'Программирование', 'История'];
    for (let i = 1; i <= 8; i++) {
        const semester = `Сессия ${i}`;
        initialData[semester] = {};
        subjects.forEach(subject => {
            initialData[semester][subject] = null;
        });
    }
    saveGradesData(initialData);
    return initialData;
}

//для отображения интерфейса
let loggedInUser = null;
let selectedStudentId = null;
let activeEditorRow = null;

function login() {
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;

    const user = users.find(u => u.username === usernameInput && u.password === passwordInput);

    if (user) {
        loggedInUser = user;
        document.getElementById('login-form').classList.add('hidden');
        if (user.role === 'teacher') {
            showTeacherPanel();
        } else if (user.role === 'student') {
            showStudentPanel();
        }
    } else {
        alert('Неверный логин или пароль.');
    }
}

function showTeacherPanel() {
    document.getElementById('teacher-panel').classList.remove('hidden');
    renderStudentsTable();
    document.getElementById('student-grades-editor').classList.add('hidden');
    document.getElementById('add-subject-dialog').classList.add('hidden');
}

function showStudentPanel() {
    const student = users.find(u => u === loggedInUser);
    if (student) {
        document.getElementById('student-panel').classList.remove('hidden');
        renderStudentInfo();
        renderStudentGrades();
    }
}

function renderStudentsTable() {
    const studentsTableDiv = document.getElementById('students-table');
    studentsTableDiv.innerHTML = '';

    const table = document.createElement('table');
    let headerRow = table.insertRow();
    headerRow.insertCell().textContent = 'ФИО';
    headerRow.insertCell().textContent = 'Группа';
    headerRow.insertCell().textContent = 'Шифр';
    headerRow.insertCell().textContent = 'Средний балл'; 

    const studentUsers = users.filter(user => user.role === 'student');
    studentUsers.forEach(student => {
        let row = table.insertRow();
        
        row.classList.add('student-row');
        row.insertCell().textContent = student.details.fullName;
        row.insertCell().textContent = student.details.group || '-';
        row.insertCell().textContent = student.details.studentId || '-';

        //  средний балл
        const studentInstance = new Student(student.username, student.password, student.details.fullName, student.details.group, student.details.studentId);
        const averageGrade = studentInstance.calculateAverageGrade(student.marks);
        row.insertCell().textContent = averageGrade;

        row.onclick = () => toggleStudentGradesEditor(student.username, row);
        table.appendChild(row);
    });

    studentsTableDiv.appendChild(table);
}

function toggleStudentGradesEditor(studentId, rowElement) {
    const editor = document.getElementById('student-grades-editor');

    if (selectedStudentId === studentId) {
        editor.classList.add('hidden');
        selectedStudentId = null;
        activeEditorRow = null;
    } else {
        selectedStudentId = studentId;
        activeEditorRow = rowElement;
        renderStudentGradesEditorForTeacher(studentId, rowElement);
        editor.classList.remove('hidden');
    }
}

function renderStudentGradesEditorForTeacher(studentId, rowElement) {
    const student = users.find(user => user.role === 'student' && user.username === studentId);
    if (!student) return;

    const editor = document.getElementById('student-grades-editor');

    //позиционка под строкой студента
    const rowRect = rowElement.getBoundingClientRect();
    editor.style.top = (rowRect.bottom + window.scrollY) + 'px';
    editor.style.left = (rowRect.left + window.scrollX) + 'px';

    const sessionSelect = document.getElementById('session-select');
    sessionSelect.innerHTML = '';
    for (let i = 1; i <= 8; i++) {
        const option = document.createElement('option');
        option.value = `Сессия ${i}`;
        option.textContent = `Сессия ${i}`;
        sessionSelect.appendChild(option);
    }

    sessionSelect.onchange = () => {
        renderSessionGrades(student, sessionSelect.value);
    };

    renderSessionGrades(student, sessionSelect.value);

    const addSubjectButton = document.getElementById('add-subject-button');
    if (addSubjectButton) {
        addSubjectButton.onclick = () => openAddSubjectDialog();
    }
}

function renderSessionGrades(student, sessionId) {
    const sessionGradesDiv = document.getElementById('session-grades');
    sessionGradesDiv.innerHTML = '';

    if (!student.subjects[sessionId]) {
        student.subjects[sessionId] = [];
    }
    if (!student.marks[sessionId]) {
        student.marks[sessionId] = {};
    }

    const table = document.createElement('table');

    const subjects = student.subjects[sessionId].sort();
    subjects.forEach(subject => {
        let row = table.insertRow();
        row.classList.add('subject-row');

        let deleteCell = row.insertCell();
        let deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-subject-button');
        deleteButton.textContent = '✖';
        deleteButton.onclick = () => deleteSubject(student, sessionId, subject);
        deleteCell.appendChild(deleteButton);

        row.insertCell().textContent = subject;
        let cell = row.insertCell();
        cell.classList.add('edit-cell');
        let input = document.createElement('input');
        input.type = 'number';
        input.min = '2';
        input.max = '5';
        input.value = student.marks[sessionId][subject] === null ? '' : student.marks[sessionId][subject];
        cell.appendChild(input);
    });

    sessionGradesDiv.appendChild(table);
}

function deleteSubject(student, sessionId, subjectToDelete) {
    if (confirm(`Вы уверены, что хотите удалить предмет "${subjectToDelete}" из ${sessionId}?`)) {
        student.subjects[sessionId] = student.subjects[sessionId].filter(subject => subject !== subjectToDelete);
        if (student.marks[sessionId] && student.marks[sessionId][subjectToDelete]) {
            delete student.marks[sessionId][subjectToDelete]
        }
        saveUsersData(users);
        renderSessionGrades(student, sessionId);
    }
}

function saveSessionGrades() {
    const sessionId = document.getElementById('session-select').value;
    const sessionGradesDiv = document.getElementById('session-grades');
    const inputs = sessionGradesDiv.querySelectorAll('input[type="number"]');
    const student = users.find(user => user.role === 'student' && user.username === selectedStudentId);
    if (!student) return;
    inputs.forEach(input => {
        const subject = input.parentNode.previousElementSibling.textContent;
        const gradeValue = parseInt(input.value);
        if (!isNaN(gradeValue) && gradeValue >= 2 && gradeValue <= 5) {
            if (!student.marks[sessionId]) {
                student.marks[sessionId] = {};
            }
            student.marks[sessionId][subject] = gradeValue;
        } else if (input.value === '') {
            if (student.marks[sessionId] && student.marks[sessionId][subject]) {
                delete student.marks[sessionId][subject];
            }
        }
    });
    saveUsersData(users);
    alert('Оценки за сессию сохранены.');
}

function renderStudentInfo() {
    const studentInfoDiv = document.getElementById('student-info');
    studentInfoDiv.innerHTML = '';
    const student = users.find(u => u === loggedInUser);
    if (student) {
        const p = document.createElement('p');
        p.innerHTML = `<strong>ФИО:</strong> ${student.details.fullName}<br>
                               <strong>Группа:</strong> ${student.details.group}<br>
                               <strong>Шифр:</strong> ${student.details.studentId}`;
        studentInfoDiv.appendChild(p);

        const studentInstance = new Student(student.username, student.password, student.details.fullName, student.details.group, student.details.studentId);
        const averageGrade = studentInstance.calculateAverageGrade(student.marks);
        const averageP = document.createElement('p');
        averageP.innerHTML = `<strong>Средний балл:</strong> ${averageGrade}`;
        studentInfoDiv.appendChild(averageP);
    }
}

function renderStudentGrades() {
    const gradesViewDiv = document.getElementById('grades-view');
    gradesViewDiv.innerHTML = '';
    const student = users.find(u => u === loggedInUser);
    if (!student) return;

    const gradesData = student.marks;

    const table = document.createElement('table');
    let headerRow = table.insertRow();
    headerRow.insertCell().textContent = 'Предмет';

    for (let i = 1; i <= 8; i++) {
        headerRow.insertCell().textContent = `Сессия ${i}`;
    }

    let allSubjects = new Set();
    for (const semester in gradesData) {
        Object.keys(gradesData[semester]).forEach(subject => allSubjects.add(subject));
    }
    const subjects = Array.from(allSubjects);

    subjects.forEach(subject => {
        let row = table.insertRow();
        row.insertCell().textContent = subject;
        for (let i = 1; i <= 8; i++) {
            const semester = `Сессия ${i}`;
            const cell = row.insertCell();
            cell.textContent = gradesData[semester] && gradesData[semester][subject] !== undefined ? gradesData[semester][subject] : '-';
        }
    });

    gradesViewDiv.appendChild(table);
}

function resetSessionGrades() {
    const sessionId = document.getElementById('session-select').value;
    const student = users.find(user => user.role === 'student' && user.username === selectedStudentId);

    if (!student) return;

    if (confirm(`Вы уверены, что хотите сбросить успеваемость за ${sessionId}?`)) {
        if (student.marks[sessionId]) {
            student.marks[sessionId] = {};
        }
        if (student.subjects[sessionId]) {
            student.subjects[sessionId] = [];
        }
        saveUsersData(users);
        renderSessionGrades(student, sessionId);
        alert(`Успеваемость за ${sessionId} сброшена`);
    }
}

function openAddSubjectDialog() {
    console.log('вызвана');
    document.getElementById('add-subject-dialog').style.display = 'block';
}

function closeAddSubjectDialog() {
    document.getElementById('add-subject-dialog').style.display = 'none';
}

function confirmAddSubject() {
    const newSubjectName = document.getElementById('new-subject-name').value;
    if (newSubjectName && newSubjectName.trim() !== '') {
        const currentSession = document.getElementById('session-select').value;
        const student = users.find(user => user.role === 'student' && user.username === selectedStudentId);
        if (!student) return;

        if (!student.subjects[currentSession]) {
            student.subjects[currentSession] = [];
        }
        if (!student.subjects[currentSession].includes(newSubjectName)) {
            student.subjects[currentSession].push(newSubjectName);
            saveUsersData(users);
            renderSessionGrades(student, currentSession);
        }
        closeAddSubjectDialog();
    }
}

function openAddStudentModal() {
    document.getElementById('add-student-modal').classList.remove('hidden');
}

function closeAddStudentModal() {
    document.getElementById('add-student-modal').classList.add('hidden');
    document.getElementById('add-student-errors').innerHTML = '';
    document.getElementById('new-student-fullname').value = '';
    document.getElementById('new-student-group').value = '';
    document.getElementById('new-student-id').value = '';
    document.getElementById('new-student-username').value = '';
    document.getElementById('new-student-password').value = '';
}

function addNewStudent() {
    const fullName = document.getElementById('new-student-fullname').value;
    const group = document.getElementById('new-student-group').value;
    const studentId = document.getElementById('new-student-id').value;
    const username = document.getElementById('new-student-username').value;
    const password = document.getElementById('new-student-password').value;
    const errorDiv = document.getElementById('add-student-errors');

    errorDiv.innerHTML = '';
    let errors = [];

    if (!fullName) {
        errors.push('введите ФИО.');
    }
    if (!group) {
        errors.push(' введите группу.');
    }
    if (!studentId) {
        errors.push(' введите шифр.');
    }
    if (!username) {
        errors.push('введите логин.');
    }
    if (!password) {
        errors.push('введите пароль.');
    }

    if (isUsernameTaken(username)) {
        errors.push('Этот логин уже используется');
    }
    if (isStudentIdTaken(studentId)) {
        errors.push('Этот шифр уже используется');
    }

    if (errors.length > 0) {
        errorDiv.innerHTML = errors.join('<br>');
        return;
    }

    const newStudent = new Student(username, password, fullName, group, studentId);
    const currentUsers = getUsersData();
    currentUsers.push(newStudent);
    saveUsersData(currentUsers);
    renderStudentsTable();
    closeAddStudentModal();
}
function isUsernameTaken(username) {
    const currentUsers = getUsersData();
    return currentUsers.some(user => user.username === username);
}

function isStudentIdTaken(studentId) {
    const currentUsers = getUsersData();
    return currentUsers.some(user => user.details.studentId === studentId);
}