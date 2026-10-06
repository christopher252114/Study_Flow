(() => {
    'use strict';

    /* ================= Helpers ================= */

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const esc = value =>
        String(value ?? '').replace(
            /[&<>"']/g,
            char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char])
        );

    const pad = number =>
        String(number).padStart(2, '0');

    const iso = date =>
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    const today = () =>
        iso(new Date());

    const addDays = number => {
        const date = new Date();
        date.setDate(date.getDate() + number);
        return iso(date);
    };

    const uid = () =>
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 7);

    const pl = (number, word) =>
        `${number} ${word}${number === 1 ? '' : 's'}`;

    const fmtDate = date => {
        if (!date) {
            return '';
        }

        const parsed = new Date(date + 'T00:00:00');

        if (isNaN(parsed)) {
            return '—';
        }

        return parsed.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const fmtTime = time => {
        if (!/^\d{2}:\d{2}$/.test(time || '')) {
            return '';
        }

        const [hour, minute] = time.split(':').map(Number);

        return `${hour % 12 || 12}:${pad(minute)} ${
            hour < 12 ? 'AM' : 'PM'
        }`;
    };


    /* ================= Data Layer ================= */

    /*
        Version 2 storage keys.

        These are intentionally different from the old keys.
        This prevents the old demo/sample data from loading.
    */

    const K = {
        tasks: 'studyflow_v2_tasks',
        subjects: 'studyflow_v2_subjects',
        sessions: 'studyflow_v2_sessions',
        notes: 'studyflow_v2_notes',
        settings: 'studyflow_v2_settings'
    };

    const PR = [
        'Low',
        'Medium',
        'High'
    ];

    const CAT = [
        'Assignment',
        'Quiz',
        'Exam',
        'Project',
        'Reading',
        'Research',
        'Other'
    ];

    const ST = [
        'Pending',
        'In Progress',
        'Completed'
    ];

    const YEARS = [
        '1st Year',
        '2nd Year',
        '3rd Year',
        '4th Year',
        'Senior High School',
        'Other'
    ];


    /*
        EMPTY DEFAULT DATA

        The system starts with no subjects,
        no tasks, no sessions, and no notes.
    */

    const defaults = {

        settings: () => ({
            theme: 'light',
            compact: false,
            showCompleted: true,
            confirmDelete: true,
            name: '',
            course: '',
            year: ''
        }),

        subjects: () => [],

        tasks: () => [],

        sessions: () => [],

        notes: () => []
    };


    function load(key) {

        const defaultValue = defaults[key]();

        let raw = null;

        try {
            raw = localStorage.getItem(K[key]);
        } catch (error) {
            raw = null;
        }

        if (raw === null) {
            return defaultValue;
        }

        try {

            const value = JSON.parse(raw);

            if (Array.isArray(defaultValue)) {

                return Array.isArray(value)
                    ? value.filter(
                        item =>
                            item &&
                            typeof item === 'object'
                    )
                    : defaultValue;
            }

            return value && typeof value === 'object'
                ? {
                    ...defaultValue,
                    ...value
                }
                : defaultValue;

        } catch (error) {

            return defaultValue;
        }
    }


    function save(key) {

        try {

            localStorage.setItem(
                K[key],
                JSON.stringify(S[key])
            );

        } catch (error) {

            toast(
                'Storage unavailable. Changes will not persist.'
            );
        }
    }


    const S = {};

    Object.keys(K).forEach(key => {
        S[key] = load(key);
    });

    Object.keys(K).forEach(key => {
        save(key);
    });


    const find = (key, id) =>
        S[key].find(item => item.id === id);

    const subj = id =>
        find('subjects', id);

    const done = task =>
        task.status === 'Completed';

    const byDue = (a, b) =>
        ((a.due || '') + (a.time || ''))
            .localeCompare(
                (b.due || '') + (b.time || '')
            );


    function upsert(key, record) {

        const index = S[key].findIndex(
            item => item.id === record.id
        );

        if (index < 0) {
            S[key].push(record);
        } else {
            S[key][index] = record;
        }

        save(key);
        closeModal();
        render();
    }


    function stats() {

        const tasks = S.tasks;
        const currentDate = today();

        const completed =
            tasks.filter(done).length;

        return {

            total: tasks.length,

            c: completed,

            pending:
                tasks.length - completed,

            prog:
                tasks.filter(
                    task =>
                        task.status === 'In Progress'
                ).length,

            od:
                tasks.filter(
                    task =>
                        !done(task) &&
                        task.due &&
                        task.due < currentDate
                ).length,

            up:
                tasks.filter(
                    task =>
                        !done(task) &&
                        task.due &&
                        task.due >= currentDate
                ).length,

            pct:
                tasks.length
                    ? Math.round(
                        completed /
                        tasks.length *
                        100
                    )
                    : 0
        };
    }


    /* ================= UI Helpers ================= */

    const PRI = {
        High: '▲',
        Medium: '●',
        Low: '▼'
    };


    const priB = priority =>
        `<span class="badge p-${esc(
            (priority || 'Medium').toLowerCase()
        )}">
            ${PRI[priority] || '●'}
            ${esc(priority || 'Medium')}
        </span>`;


    const stB = task => {

        if (done(task)) {

            return `
                <span class="badge st-done">
                    ✓ Completed
                </span>
            `;
        }

        if (
            task.due &&
            task.due < today()
        ) {

            return `
                <span class="badge st-late">
                    ! Overdue
                </span>
            `;
        }

        if (
            task.status === 'In Progress'
        ) {

            return `
                <span class="badge st-prog">
                    ◐ In Progress
                </span>
            `;
        }

        return `
            <span class="badge st-pend">
                ○ Pending
            </span>
        `;
    };


    const chip = id => {

        const subject = subj(id);

        return `
            <span class="chip">

                <i
                    style="background:${
                        subject
                            ? esc(subject.color)
                            : '#64748b'
                    }"
                ></i>

                ${esc(
                    subject
                        ? subject.name
                        : 'General'
                )}

            </span>
        `;
    };


    const bar = (percent, color) =>
        `
        <div
            class="bar"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="${percent}"
        >
            <span
                style="
                    width:${percent}%;
                    ${
                        color
                            ? `background:${esc(color)};`
                            : ''
                    }
                "
            ></span>
        </div>
        `;


    const options = (items, value) =>

        items
            .map(item => {

                const [val, label] =
                    Array.isArray(item)
                        ? item
                        : [item, item];

                return `
                    <option
                        value="${esc(val)}"
                        ${
                            val === value
                                ? 'selected'
                                : ''
                        }
                    >
                        ${esc(label)}
                    </option>
                `;
            })
            .join('');


    const empty = (
        icon,
        title,
        message,
        button = ''
    ) =>
        `
        <div class="empty">

            <div aria-hidden="true">
                ${icon}
            </div>

            <h3>${title}</h3>

            <p>${message}</p>

            ${button}

        </div>
        `;


    const subjOpts = blank => [

        ...(blank
            ? [['', 'General (no subject)']]
            : []),

        ...S.subjects.map(subject => [
            subject.id,
            subject.name
        ])
    ];


    function toast(message) {

        const toastElement =
            document.createElement('div');

        toastElement.className = 'toast';

        toastElement.textContent = message;

        $('#toasts').append(
            toastElement
        );

        setTimeout(() => {
            toastElement.remove();
        }, 3000);
    }


    /* ================= Modal ================= */

    let lastFocus = null;


    function openModal(title, html) {

        lastFocus =
            document.activeElement;

        $('#mTitle').textContent = title;

        $('#mBody').innerHTML = html;

        $('#modal').hidden = false;

        const firstField =
            $('#mBody').querySelector(
                'input, select, textarea, button'
            );

        if (firstField) {
            firstField.focus();
        }
    }


    function closeModal() {

        $('#modal').hidden = true;

        $('#mBody').innerHTML = '';

        if (
            lastFocus &&
            lastFocus.focus
        ) {
            lastFocus.focus();
        }
    }


    function fieldHtml(field, value) {

        const id =
            'f_' + field.n;

        const val =
            value ?? '';

        let element;

        if (field.t === 'select') {

            element = `
                <select
                    id="${id}"
                    name="${field.n}"
                >
                    ${options(
                        field.o,
                        val
                    )}
                </select>
            `;

        } else if (
            field.t === 'textarea'
        ) {

            element = `
                <textarea
                    id="${id}"
                    name="${field.n}"
                    rows="${field.rows || 3}"
                >${esc(val)}</textarea>
            `;

        } else {

            element = `
                <input
                    id="${id}"
                    name="${field.n}"
                    type="${field.t || 'text'}"
                    value="${esc(val)}"
                    ${field.r ? 'required' : ''}
                >
            `;
        }

        return `
            <div
                class="field${field.full ? ' full' : ''}"
                data-n="${field.n}"
            >

                <label for="${id}">
                    ${field.l}
                    ${field.r ? ' *' : ''}
                </label>

                ${element}

                <small
                    class="err"
                    role="alert"
                ></small>

            </div>
        `;
    }


    function openForm({
        title,
        label,
        fields,
        data,
        validate,
        save: onSave
    }) {

        openModal(
            title,

            `
            <form
                id="mForm"
                novalidate
            >

                <div class="grid">

                    ${fields
                        .map(
                            field =>
                                fieldHtml(
                                    field,
                                    data[field.n]
                                )
                        )
                        .join('')}

                </div>

                <div class="actions">

                    <button
                        type="button"
                        class="btn"
                        data-act="close"
                    >
                        Cancel
                    </button>

                    <button
                        class="btn primary"
                    >
                        ${label}
                    </button>

                </div>

            </form>
            `
        );


        $('#mForm').addEventListener(
            'submit',
            event => {

                event.preventDefault();

                const dataObject = {};
                const errors = {};

                fields.forEach(field => {

                    dataObject[field.n] =
                        event.target
                            .elements[field.n]
                            .value
                            .trim();

                });


                fields.forEach(field => {

                    if (
                        field.r &&
                        !dataObject[field.n]
                    ) {

                        errors[field.n] =
                            `${field.l} is required.`;
                    }
                });


                if (
                    !Object.keys(errors).length
                ) {

                    Object.assign(
                        errors,
                        validate
                            ? validate(dataObject)
                            : {}
                    );
                }


                fields.forEach(field => {

                    const wrapper =
                        $(
                            `[data-n="${field.n}"]`
                        );

                    wrapper.classList.toggle(
                        'bad',
                        !!errors[field.n]
                    );

                    $('.err', wrapper).textContent =
                        errors[field.n] || '';
                });


                if (
                    !Object.keys(errors).length
                ) {

                    onSave(dataObject);

                } else {

                    const firstBad =
                        $(
                            '.field.bad input, .field.bad select, .field.bad textarea'
                        );

                    if (firstBad) {
                        firstBad.focus();
                    }
                }

            }
        );
    }


    function del(key, id, label) {

        const run = () => {

            S[key] =
                S[key].filter(
                    item => item.id !== id
                );


            if (key === 'subjects') {

                ['tasks', 'sessions', 'notes']
                    .forEach(childKey => {

                        S[childKey].forEach(item => {

                            if (
                                item.subject === id
                            ) {
                                item.subject = '';
                            }

                        });

                        save(childKey);
                    });
            }


            save(key);

            render();

            toast(
                `${label} deleted.`
            );
        };


        if (
            !S.settings.confirmDelete
        ) {
            run();
            return;
        }


        openModal(
            'Confirm deletion',

            `
            <p>
                Delete this
                ${label.toLowerCase()}?
                This cannot be undone.
            </p>

            <div class="actions">

                <button
                    class="btn"
                    data-act="close"
                >
                    Cancel
                </button>

                <button
                    class="btn danger"
                    id="yes"
                >
                    Delete
                </button>

            </div>
            `
        );


        $('#yes').onclick = () => {

            closeModal();

            run();
        };
    }


    /* ================= Forms ================= */

    function taskForm(task) {

        const isNew = !task;

        task =
            task || {
                title: '',
                subject: '',
                category: 'Assignment',
                priority: 'Medium',
                status: 'Pending',
                due: today(),
                time: '',
                description: ''
            };


        openForm({

            title:
                isNew
                    ? 'Add Task'
                    : 'Edit Task',

            label: 'Save Task',

            data: task,

            fields: [

                {
                    n: 'title',
                    l: 'Task Title',
                    r: 1,
                    full: 1
                },

                {
                    n: 'subject',
                    l: 'Subject',
                    t: 'select',
                    o: subjOpts(true)
                },

                {
                    n: 'category',
                    l: 'Category',
                    t: 'select',
                    o: CAT
                },

                {
                    n: 'due',
                    l: 'Due Date',
                    t: 'date',
                    r: 1
                },

                {
                    n: 'time',
                    l: 'Due Time',
                    t: 'time'
                },

                {
                    n: 'priority',
                    l: 'Priority',
                    t: 'select',
                    o: PR
                },

                {
                    n: 'status',
                    l: 'Status',
                    t: 'select',
                    o: ST
                },

                {
                    n: 'description',
                    l: 'Description',
                    t: 'textarea',
                    full: 1
                }

            ],

            validate: data => {

                if (
                    !data.due
                ) {
                    return {
                        due:
                            'Due date is required.'
                    };
                }

                if (
                    isNaN(
                        new Date(
                            data.due +
                            'T00:00:00'
                        )
                    )
                ) {

                    return {
                        due:
                            'Enter a valid date.'
                    };
                }

                if (
                    isNew &&
                    data.due < today()
                ) {

                    return {
                        due:
                            'Due date cannot be in the past.'
                    };
                }

                return {};
            },

            save: data => {

                const record = {

                    ...(task.id
                        ? task
                        : {
                            id: uid()
                        }),

                    ...data,

                    completedAt:
                        data.status === 'Completed'
                            ? (
                                task.completedAt ||
                                today()
                            )
                            : ''
                };


                upsert(
                    'tasks',
                    record
                );

                toast(
                    isNew
                        ? 'Task added successfully.'
                        : 'Task updated successfully.'
                );
            }
        });
    }


    function subjectForm(subject) {

        const isNew = !subject;

        subject =
            subject || {
                name: '',
                teacher: '',
                room: '',
                color: '#4f46e5',
                description: ''
            };


        openForm({

            title:
                isNew
                    ? 'Add Subject'
                    : 'Edit Subject',

            label: 'Save Subject',

            data: subject,

            fields: [

                {
                    n: 'name',
                    l: 'Subject Name',
                    r: 1,
                    full: 1
                },

                {
                    n: 'teacher',
                    l: 'Teacher / Instructor'
                },

                {
                    n: 'room',
                    l: 'Room / Class Info'
                },

                {
                    n: 'color',
                    l: 'Color',
                    t: 'color'
                },

                {
                    n: 'description',
                    l: 'Description',
                    t: 'textarea',
                    full: 1
                }

            ],

            validate: data => {

                const duplicate =
                    S.subjects.some(
                        item =>
                            item.id !== subject.id &&
                            item.name
                                .toLowerCase() ===
                            data.name
                                .toLowerCase()
                    );

                return duplicate
                    ? {
                        name:
                            'A subject with this name already exists.'
                    }
                    : {};
            },

            save: data => {

                upsert(
                    'subjects',
                    {
                        ...(subject.id
                            ? subject
                            : {
                                id: uid()
                            }),
                        ...data
                    }
                );

                toast(
                    isNew
                        ? 'Subject added successfully.'
                        : 'Subject updated successfully.'
                );
            }
        });
    }


    function sessionForm(session) {

        const isNew = !session;

        session =
            session || {
                subject: '',
                topic: '',
                date: today(),
                start: '16:00',
                end: '17:00',
                location: '',
                notes: ''
            };


        openForm({

            title:
                isNew
                    ? 'Schedule Study Session'
                    : 'Edit Study Session',

            label: 'Save Session',

            data: session,

            fields: [

                {
                    n: 'subject',
                    l: 'Subject',
                    t: 'select',
                    o: subjOpts(true)
                },

                {
                    n: 'topic',
                    l: 'Study Topic',
                    r: 1
                },

                {
                    n: 'date',
                    l: 'Date',
                    t: 'date',
                    r: 1
                },

                {
                    n: 'location',
                    l: 'Location'
                },

                {
                    n: 'start',
                    l: 'Start Time',
                    t: 'time',
                    r: 1
                },

                {
                    n: 'end',
                    l: 'End Time',
                    t: 'time',
                    r: 1
                },

                {
                    n: 'notes',
                    l: 'Notes',
                    t: 'textarea',
                    full: 1
                }

            ],

            validate: data => {

                if (!data.date) {

                    return {
                        date:
                            'Date is required.'
                    };
                }

                if (
                    isNaN(
                        new Date(
                            data.date +
                            'T00:00:00'
                        )
                    )
                ) {

                    return {
                        date:
                            'Enter a valid date.'
                    };
                }

                if (
                    data.end <= data.start
                ) {

                    return {
                        end:
                            'End time must be after the start time.'
                    };
                }

                return {};
            },

            save: data => {

                upsert(
                    'sessions',
                    {
                        ...(session.id
                            ? session
                            : {
                                id: uid(),
                                done: false
                            }),
                        ...data
                    }
                );

                toast(
                    isNew
                        ? 'Study session scheduled.'
                        : 'Study session updated.'
                );
            }
        });
    }


    function noteForm(note) {

        const isNew = !note;

        note = note
            ? {
                ...note,
                tags:
                    (note.tags || [])
                        .join(', ')
            }
            : {
                title: '',
                subject: '',
                tags: '',
                content: ''
            };


        openForm({

            title:
                isNew
                    ? 'Add Note'
                    : 'Edit Note',

            label: 'Save Note',

            data: note,

            fields: [

                {
                    n: 'title',
                    l: 'Title',
                    r: 1,
                    full: 1
                },

                {
                    n: 'subject',
                    l: 'Subject',
                    t: 'select',
                    o: subjOpts(true)
                },

                {
                    n: 'tags',
                    l: 'Tags (comma separated)'
                },

                {
                    n: 'content',
                    l: 'Content',
                    t: 'textarea',
                    r: 1,
                    full: 1,
                    rows: 7
                }

            ],

            save: data => {

                const old =
                    note.id
                        ? find(
                            'notes',
                            note.id
                        )
                        : {
                            id: uid(),
                            created: today()
                        };


                upsert(
                    'notes',
                    {
                        ...old,
                        ...data,
                        tags:
                            data.tags
                                .split(',')
                                .map(
                                    item =>
                                        item.trim()
                                )
                                .filter(Boolean)
                    }
                );

                toast(
                    isNew
                        ? 'Note added successfully.'
                        : 'Note updated successfully.'
                );
            }
        });
    }


    /* ================= Pages ================= */

    const F = {
        q: '',
        p: '',
        s: '',
        sub: '',
        sort: 'asc',
        nq: '',
        nsub: ''
    };


    const cal = {
        y: new Date().getFullYear(),
        m: new Date().getMonth(),
        sel: today()
    };


    const miniTask = (
        task,
        showDate
    ) =>
        `
        <li
            class="row${done(task) ? ' is-done' : ''}"
        >

            <button
                class="check"
                data-act="toggle"
                data-id="${task.id}"
                aria-label="${
                    done(task)
                        ? 'Mark pending'
                        : 'Mark completed'
                }: ${esc(task.title)}"
            >
                ${done(task) ? '✓' : ''}
            </button>

            <div class="grow">

                <strong>
                    ${esc(task.title)}
                </strong>

                <small>

                    ${chip(task.subject)}

                    ${priB(task.priority)}

                    <span>
                        ${
                            showDate
                                ? fmtDate(task.due) + ' '
                                : ''
                        }

                        ${fmtTime(task.time)}
                    </span>

                </small>

            </div>

            ${stB(task)}

        </li>
        `;


    const statCard = (
        icon,
        number,
        label,
        subtext
    ) =>
        `
        <article class="card stat">

            <div
                class="ico"
                aria-hidden="true"
            >
                ${icon}
            </div>

            <div>

                <b>${number}</b>

                <strong>
                    ${label}
                </strong>

                <br>

                <small>
                    ${subtext}
                </small>

            </div>

        </article>
        `;


    /* ================= Dashboard ================= */

    function dashboard() {

        const stat = stats();
        const currentDate = today();

        const todayTasks =
            S.tasks
                .filter(
                    task =>
                        task.due === currentDate
                )
                .sort(byDue);

        const upcoming =
            S.tasks
                .filter(
                    task =>
                        !done(task) &&
                        task.due > currentDate
                )
                .sort(byDue)
                .slice(0, 5);


        const studentName =
            S.settings.name.trim()
                ? S.settings.name
                : 'Student';


        return `

        <section class="card hero">

            <div>

                <h2>
                    Good day,
                    ${esc(studentName)}!
                </h2>

                <p>
                    Stay organized.
                    Stay focused.
                    Keep learning.
                </p>

            </div>

            <time datetime="${currentDate}">
                ${new Date().toLocaleDateString(
                    'en-US',
                    {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                    }
                )}
            </time>

        </section>


        <section
            class="stats"
            aria-label="Task statistics"
        >

            ${statCard(
                '📋',
                stat.total,
                'Total Tasks',
                'Across ' +
                pl(
                    S.subjects.length,
                    'subject'
                )
            )}

            ${statCard(
                '✅',
                stat.c,
                'Completed Tasks',
                stat.pct +
                '% completion rate'
            )}

            ${statCard(
                '⏳',
                stat.pending,
                'Pending Tasks',
                stat.prog +
                ' in progress'
            )}

            ${statCard(
                '⚠️',
                stat.od,
                'Overdue Tasks',
                stat.od
                    ? 'Needs attention'
                    : 'All caught up'
            )}

        </section>


        <div class="cols2">

            <section class="card">

                <h2>
                    Today's Tasks
                </h2>

                ${
                    todayTasks.length
                        ? `
                            <ul class="list">
                                ${
                                    todayTasks
                                        .map(task =>
                                            miniTask(task)
                                        )
                                        .join('')
                                }
                            </ul>
                        `
                        : `
                            <p class="muted">
                                Nothing due today.
                                Add a task when you are ready.
                            </p>
                        `
                }

            </section>


            <section class="card">

                <h2>
                    Upcoming Deadlines
                </h2>

                ${
                    upcoming.length
                        ? `
                            <ul class="list">
                                ${
                                    upcoming
                                        .map(
                                            task =>
                                                miniTask(
                                                    task,
                                                    true
                                                )
                                        )
                                        .join('')
                                }
                            </ul>
                        `
                        : `
                            <p class="muted">
                                No upcoming deadlines.
                            </p>
                        `
                }

            </section>


            <section class="card">

                <h2>
                    Study Progress
                </h2>

                <p>
                    <strong>
                        ${stat.pct}%
                    </strong>
                    overall completion
                </p>

                ${bar(stat.pct)}

                <p class="muted">
                    ${stat.c}
                    of
                    ${stat.total}
                    tasks completed
                </p>

            </section>


            <section class="card">

                <h2>
                    Quick Actions
                </h2>

                <div class="toolbar">

                    <button
                        class="btn primary"
                        data-act="addTask"
                    >
                        ＋ Add Task
                    </button>

                    <button
                        class="btn"
                        data-act="addSubject"
                    >
                        ＋ Add Subject
                    </button>

                    <button
                        class="btn"
                        data-act="addNote"
                    >
                        ＋ Add Note
                    </button>

                    <button
                        class="btn"
                        data-act="addSession"
                    >
                        📅 Schedule Study Session
                    </button>

                </div>

            </section>

        </div>
        `;
    }


    /* ================= Tasks ================= */

    function taskTable() {

        const query =
            F.q.toLowerCase();


        const list =
            S.tasks
                .filter(task => {

                    const searchable =
                        (
                            task.title || ''
                        ) +
                        ' ' +
                        (
                            task.description || ''
                        );

                    return (

                        (
                            !query ||
                            searchable
                                .toLowerCase()
                                .includes(query)
                        ) &&

                        (
                            !F.p ||
                            task.priority === F.p
                        ) &&

                        (
                            !F.s ||
                            task.status === F.s
                        ) &&

                        (
                            !F.sub ||
                            task.subject === F.sub
                        ) &&

                        (
                            S.settings.showCompleted ||
                            F.s === 'Completed' ||
                            !done(task)
                        )
                    );
                })
                .sort(byDue);


        if (
            F.sort === 'desc'
        ) {
            list.reverse();
        }


        if (!list.length) {

            return empty(
                '📝',
                'No tasks found',
                S.tasks.length
                    ? 'Try changing your search or filters.'
                    : 'Add your first task to start planning.',

                `
                <button
                    class="btn primary"
                    data-act="addTask"
                >
                    ＋ Add Task
                </button>
                `
            );
        }


        return `

        <div class="tablewrap">

            <table>

                <thead>

                    <tr>

                        <th>Task</th>
                        <th>Subject</th>
                        <th>Due Date</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Actions</th>

                    </tr>

                </thead>

                <tbody>

                    ${
                        list
                            .map(task => `

                                <tr
                                    ${
                                        done(task)
                                            ? 'class="is-done"'
                                            : ''
                                    }
                                >

                                    <td>

                                        <strong>
                                            ${esc(task.title)}
                                        </strong>

                                        <br>

                                        <small>
                                            ${esc(
                                                task.category || ''
                                            )}
                                        </small>

                                    </td>

                                    <td>
                                        ${chip(task.subject)}
                                    </td>

                                    <td>

                                        ${fmtDate(task.due)}

                                        <br>

                                        <small>
                                            ${fmtTime(task.time)}
                                        </small>

                                    </td>

                                    <td>
                                        ${priB(task.priority)}
                                    </td>

                                    <td>
                                        ${stB(task)}
                                    </td>

                                    <td>

                                        <div class="acts">

                                            <button
                                                class="btn sm"
                                                data-act="toggle"
                                                data-id="${task.id}"
                                            >
                                                ${
                                                    done(task)
                                                        ? 'Undo'
                                                        : 'Complete'
                                                }
                                            </button>

                                            <button
                                                class="btn sm"
                                                data-act="editTask"
                                                data-id="${task.id}"
                                            >
                                                Edit
                                            </button>

                                            <button
                                                class="btn sm"
                                                data-act="delTask"
                                                data-id="${task.id}"
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </td>

                                </tr>

                            `)
                            .join('')
                    }

                </tbody>

            </table>

        </div>
        `;
    }


    const filter = (
        field,
        label,
        choices
    ) =>
        `
        <select
            data-f="${field}"
            aria-label="${label}"
        >

            <option value="">
                ${label}
            </option>

            ${options(
                choices,
                F[field]
            )}

        </select>
        `;


    const tasks = () =>

        `

        <div class="toolbar">

            <input
                type="search"
                data-f="q"
                placeholder="Search tasks..."
                aria-label="Search tasks"
                value="${esc(F.q)}"
            >

            ${filter(
                'p',
                'All priorities',
                PR
            )}

            ${filter(
                's',
                'All statuses',
                ST
            )}

            ${filter(
                'sub',
                'All subjects',
                subjOpts()
            )}

            <select
                data-f="sort"
                aria-label="Sort by due date"
            >

                ${options(
                    [
                        [
                            'asc',
                            'Due date: earliest first'
                        ],
                        [
                            'desc',
                            'Due date: latest first'
                        ]
                    ],
                    F.sort
                )}

            </select>

            <button
                class="btn primary"
                data-act="addTask"
            >
                ＋ Add Task
            </button>

        </div>

        <div id="list">
            ${taskTable()}
        </div>

        `;


    /* ================= Subjects ================= */

    function subjects() {

        const add =
            `
            <button
                class="btn primary"
                data-act="addSubject"
            >
                ＋ Add Subject
            </button>
            `;


        if (
            !S.subjects.length
        ) {

            return empty(
                '📚',
                'No subjects yet',
                'Add a subject to organize your tasks and notes.',
                add
            );
        }


        return `

        <div class="toolbar">
            ${add}
        </div>

        <div class="cards">

            ${
                S.subjects
                    .map(subject => {

                        const subjectTasks =
                            S.tasks.filter(
                                task =>
                                    task.subject ===
                                    subject.id
                            );


                        const percent =
                            subjectTasks.length
                                ? Math.round(
                                    subjectTasks.filter(
                                        done
                                    ).length /
                                    subjectTasks.length *
                                    100
                                )
                                : 0;


                        return `

                        <article
                            class="card subj"
                            style="--c:${esc(
                                subject.color
                            )}"
                        >

                            <h3>
                                ${esc(
                                    subject.name
                                )}
                            </h3>

                            <p class="muted">

                                👤
                                ${esc(
                                    subject.teacher ||
                                    'Instructor not set'
                                )}

                                ${
                                    subject.room
                                        ? `
                                            · 📍
                                            ${esc(
                                                subject.room
                                            )}
                                        `
                                        : ''
                                }

                            </p>

                            ${
                                subject.description
                                    ? `
                                        <p>
                                            ${esc(
                                                subject.description
                                            )}
                                        </p>
                                    `
                                    : ''
                            }

                            <p>

                                <strong>
                                    ${pl(
                                        subjectTasks.length,
                                        'task'
                                    )}
                                </strong>

                                ·

                                ${percent}%
                                complete

                            </p>

                            ${bar(
                                percent,
                                subject.color
                            )}

                            <div class="actions">

                                <button
                                    class="btn sm"
                                    data-act="editSubject"
                                    data-id="${subject.id}"
                                >
                                    Edit
                                </button>

                                <button
                                    class="btn sm"
                                    data-act="delSubject"
                                    data-id="${subject.id}"
                                >
                                    Delete
                                </button>

                            </div>

                        </article>

                        `;

                    })
                    .join('')
            }

        </div>

        `;
    }


    /* ================= Schedule ================= */

    function schedule() {

        const add =
            `
            <button
                class="btn primary"
                data-act="addSession"
            >
                ＋ Schedule Study Session
            </button>
            `;


        if (
            !S.sessions.length
        ) {

            return empty(
                '⏰',
                'No study sessions',
                'Plan a session to block out focused study time.',
                add
            );
        }


        const list =
            [...S.sessions]
                .sort(
                    (a, b) =>
                        (
                            (a.date || '') +
                            (a.start || '')
                        ).localeCompare(
                            (b.date || '') +
                            (b.start || '')
                        )
                );


        let lastDate = '';
        let output = '';


        list.forEach(session => {

            if (
                session.date !== lastDate
            ) {

                output += `

                    <h3 class="day">

                        ${
                            session.date === today()
                                ? 'Today · '
                                : ''
                        }

                        ${fmtDate(
                            session.date
                        )}

                    </h3>

                `;

                lastDate =
                    session.date;
            }


            const subject =
                subj(session.subject);


            output += `

            <article
                class="slot${
                    session.done
                        ? ' is-done'
                        : ''
                }"
                style="--c:${
                    subject
                        ? esc(subject.color)
                        : '#64748b'
                }"
            >

                <div class="time">

                    ${fmtTime(
                        session.start
                    )}

                    –

                    ${fmtTime(
                        session.end
                    )}

                </div>

                <div class="grow">

                    <strong>
                        ${esc(
                            session.topic
                        )}
                    </strong>

                    <br>

                    <small>

                        ${chip(
                            session.subject
                        )}

                        ${
                            session.location
                                ? `
                                    · 📍
                                    ${esc(
                                        session.location
                                    )}
                                `
                                : ''
                        }

                    </small>

                    ${
                        session.notes
                            ? `
                                <br>
                                <small>
                                    ${esc(
                                        session.notes
                                    )}
                                </small>
                            `
                            : ''
                    }

                </div>

                ${
                    session.done
                        ? `
                            <span class="badge st-done">
                                ✓ Done
                            </span>
                        `
                        : `
                            <span class="badge st-pend">
                                ○ Planned
                            </span>
                        `
                }

                <div class="acts">

                    <button
                        class="btn sm"
                        data-act="doneSession"
                        data-id="${session.id}"
                    >
                        ${
                            session.done
                                ? 'Undo'
                                : 'Complete'
                        }
                    </button>

                    <button
                        class="btn sm"
                        data-act="editSession"
                        data-id="${session.id}"
                    >
                        Edit
                    </button>

                    <button
                        class="btn sm"
                        data-act="delSession"
                        data-id="${session.id}"
                    >
                        Delete
                    </button>

                </div>

            </article>

            `;
        });


        return `

        <div class="toolbar">
            ${add}
        </div>

        <div class="timeline">
            ${output}
        </div>

        `;
    }


    /* ================= Notes ================= */

    function notesGrid() {

        const query =
            F.nq.toLowerCase();


        const list =
            S.notes
                .filter(note => {

                    const searchable =
                        (note.title || '') +
                        ' ' +
                        (note.content || '') +
                        ' ' +
                        (note.tags || []).join(' ');


                    return (

                        (
                            !F.nsub ||
                            note.subject === F.nsub
                        ) &&

                        (
                            !query ||
                            searchable
                                .toLowerCase()
                                .includes(query)
                        )
                    );
                })
                .sort(
                    (a, b) =>
                        (b.created || '')
                            .localeCompare(
                                a.created || ''
                            )
                );


        if (
            !list.length
        ) {

            return empty(
                '🗒️',
                'No notes found',
                S.notes.length
                    ? 'Try a different search or subject.'
                    : 'Capture your first study note.',

                `
                <button
                    class="btn primary"
                    data-act="addNote"
                >
                    ＋ Add Note
                </button>
                `
            );
        }


        return `

        <div class="cards">

            ${
                list
                    .map(note => {

                        const subject =
                            subj(note.subject);


                        return `

                        <article
                            class="card note"
                            style="--c:${
                                subject
                                    ? esc(subject.color)
                                    : '#64748b'
                            }"
                        >

                            <h3>
                                ${esc(
                                    note.title
                                )}
                            </h3>

                            <div>

                                ${chip(
                                    note.subject
                                )}

                                <small>
                                    ·
                                    ${fmtDate(
                                        note.created
                                    )}
                                </small>

                            </div>

                            <p class="muted">

                                ${esc(
                                    (
                                        note.content ||
                                        ''
                                    ).slice(0, 140)
                                )}

                                ${
                                    (
                                        note.content ||
                                        ''
                                    ).length > 140
                                        ? '…'
                                        : ''
                                }

                            </p>

                            <div>

                                ${
                                    (note.tags || [])
                                        .map(
                                            tag =>
                                                `
                                                <span class="tag">
                                                    #${esc(tag)}
                                                </span>
                                                `
                                        )
                                        .join('')
                                }

                            </div>

                            <div class="actions">

                                <button
                                    class="btn sm"
                                    data-act="viewNote"
                                    data-id="${note.id}"
                                >
                                    View
                                </button>

                                <button
                                    class="btn sm"
                                    data-act="editNote"
                                    data-id="${note.id}"
                                >
                                    Edit
                                </button>

                                <button
                                    class="btn sm"
                                    data-act="delNote"
                                    data-id="${note.id}"
                                >
                                    Delete
                                </button>

                            </div>

                        </article>

                        `;

                    })
                    .join('')
            }

        </div>

        `;
    }


    const notes = () =>

        `

        <div class="toolbar">

            <input
                type="search"
                data-f="nq"
                placeholder="Search notes..."
                aria-label="Search notes"
                value="${esc(F.nq)}"
            >

            ${filter(
                'nsub',
                'All subjects',
                subjOpts()
            )}

            <button
                class="btn primary"
                data-act="addNote"
            >
                ＋ Add Note
            </button>

        </div>

        <div id="list">
            ${notesGrid()}
        </div>

        `;


    /* ================= Calendar ================= */

    function calendar() {

        const first =
            new Date(
                cal.y,
                cal.m,
                1
            );

        const daysInMonth =
            new Date(
                cal.y,
                cal.m + 1,
                0
            ).getDate();


        let cells =
            '<div class="cell blank"></div>'
                .repeat(
                    first.getDay()
                );


        for (
            let day = 1;
            day <= daysInMonth;
            day++
        ) {

            const dateString =
                `${cal.y}-${pad(
                    cal.m + 1
                )}-${pad(day)}`;


            const taskCount =
                S.tasks.filter(
                    task =>
                        task.due === dateString
                ).length;


            const sessionCount =
                S.sessions.filter(
                    session =>
                        session.date === dateString
                ).length;


            cells += `

                <button
                    class="cell${
                        dateString === today()
                            ? ' today'
                            : ''
                    }${
                        dateString === cal.sel
                            ? ' sel'
                            : ''
                    }"
                    data-act="pick"
                    data-id="${dateString}"
                    aria-label="${fmtDate(
                        dateString
                    )}: ${pl(
                        taskCount,
                        'task'
                    )}, ${pl(
                        sessionCount,
                        'study session'
                    )}"
                >

                    <b>
                        ${day}
                    </b>

                    <span class="dots">

                        ${
                            taskCount
                                ? `
                                    <i
                                        class="dot"
                                        title="${pl(
                                            taskCount,
                                            'task'
                                        )}"
                                    ></i>
                                `
                                : ''
                        }

                        ${
                            sessionCount
                                ? `
                                    <i
                                        class="dot s"
                                        title="${pl(
                                            sessionCount,
                                            'session'
                                        )}"
                                    ></i>
                                `
                                : ''
                        }

                    </span>

                </button>

            `;
        }


        const selectedTasks =
            S.tasks
                .filter(
                    task =>
                        task.due === cal.sel
                )
                .sort(byDue);


        const selectedSessions =
            S.sessions
                .filter(
                    session =>
                        session.date === cal.sel
                )
                .sort(
                    (a, b) =>
                        a.start.localeCompare(
                            b.start
                        )
                );


        return `

        <section class="card">

            <div class="calhead">

                <button
                    class="btn"
                    data-act="calPrev"
                    aria-label="Previous month"
                >
                    ‹
                </button>

                <h2>

                    ${first.toLocaleDateString(
                        'en-US',
                        {
                            month: 'long',
                            year: 'numeric'
                        }
                    )}

                </h2>

                <button
                    class="btn"
                    data-act="calNext"
                    aria-label="Next month"
                >
                    ›
                </button>

                <button
                    class="btn"
                    data-act="calToday"
                >
                    Today
                </button>

            </div>


            <div class="calgrid">

                ${
                    [
                        'Sun',
                        'Mon',
                        'Tue',
                        'Wed',
                        'Thu',
                        'Fri',
                        'Sat'
                    ]
                        .map(
                            day =>
                                `
                                <div class="dow">
                                    ${day}
                                </div>
                                `
                        )
                        .join('')
                }

                ${cells}

            </div>


            <p class="legend">

                <span class="dot"></span>
                Task deadline

                <span class="dot s"></span>
                Study session

            </p>

        </section>


        <section class="card">

            <h2>
                ${fmtDate(cal.sel)}
            </h2>

            ${
                selectedTasks.length ||
                selectedSessions.length

                    ? `

                        <ul class="list">

                            ${
                                selectedTasks
                                    .map(
                                        task =>
                                            miniTask(task)
                                    )
                                    .join('')
                            }

                            ${
                                selectedSessions
                                    .map(
                                        session =>
                                            `
                                            <li
                                                class="row${
                                                    session.done
                                                        ? ' is-done'
                                                        : ''
                                                }"
                                            >

                                                <span
                                                    aria-hidden="true"
                                                >
                                                    📅
                                                </span>

                                                <div class="grow">

                                                    <strong>
                                                        ${esc(
                                                            session.topic
                                                        )}
                                                    </strong>

                                                    <small>

                                                        ${chip(
                                                            session.subject
                                                        )}

                                                        ${fmtTime(
                                                            session.start
                                                        )}

                                                        –

                                                        ${fmtTime(
                                                            session.end
                                                        )}

                                                        ${
                                                            session.location
                                                                ? `
                                                                    ·
                                                                    ${esc(
                                                                        session.location
                                                                    )}
                                                                `
                                                                : ''
                                                        }

                                                    </small>

                                                </div>

                                                <span class="badge st-pend">
                                                    Study session
                                                </span>

                                            </li>
                                            `
                                    )
                                    .join('')
                            }

                        </ul>

                    `

                    : `
                        <p class="muted">
                            No tasks or study sessions on this day.
                        </p>
                    `
            }

        </section>

        `;
    }


    /* ================= Progress ================= */

    function progress() {

        const stat =
            stats();

        const circumference =
            2 *
            Math.PI *
            52;


        const maxValue = array =>
            Math.max(
                1,
                ...array.map(
                    item => item[1]
                )
            );


        const priorityData =
            [
                'High',
                'Medium',
                'Low'
            ].map(priority => [

                priority,

                S.tasks.filter(
                    task =>
                        task.priority === priority
                ).length

            ]);


        const subjectData =
            S.subjects.map(subject => [

                subject.name,

                S.tasks.filter(
                    task =>
                        task.subject ===
                        subject.id
                ).length,

                subject.color

            ]);


        const days =
            [...Array(7)].map(
                (_, index) => {

                    const date =
                        addDays(
                            index - 6
                        );


                    return [

                        new Date(
                            date +
                            'T00:00:00'
                        ).toLocaleDateString(
                            'en-US',
                            {
                                weekday: 'short'
                            }
                        ),

                        S.tasks.filter(
                            task =>
                                task.completedAt ===
                                date
                        ).length

                    ];
                }
            );


        const horizontalBars =
            (
                list,
                defaultColor
            ) =>
                list
                    .map(
                        ([label, number, color]) =>
                            `

                            <div class="hb">

                                <span>
                                    ${esc(label)}
                                </span>

                                ${bar(
                                    Math.round(
                                        number /
                                        maxValue(list) *
                                        100
                                    ),
                                    color ||
                                    defaultColor
                                )}

                                <b>
                                    ${number}
                                </b>

                            </div>

                            `
                    )
                    .join('');


        const upcomingSessions =
            S.sessions.filter(
                session =>
                    !session.done &&
                    session.date >= today()
            ).length;


        return `

        <section class="stats">

            ${statCard(
                '📋',
                stat.total,
                'Total tasks',
                ''
            )}

            ${statCard(
                '✅',
                stat.c,
                'Completed',
                ''
            )}

            ${statCard(
                '⏳',
                stat.pending,
                'Pending',
                ''
            )}

            ${statCard(
                '⚠️',
                stat.od,
                'Overdue',
                ''
            )}

        </section>


        <div class="cols2">

            <section class="card">

                <h2>
                    Task Completion
                </h2>

                <div class="ringwrap">

                    <svg
                        class="ring"
                        width="140"
                        height="140"
                        viewBox="0 0 140 140"
                        role="img"
                        aria-label="${
                            stat.pct
                        }% of tasks completed"
                    >

                        <circle
                            cx="70"
                            cy="70"
                            r="52"
                            fill="none"
                            stroke="var(--border)"
                            stroke-width="14"
                        />

                        <circle
                            cx="70"
                            cy="70"
                            r="52"
                            fill="none"
                            stroke="var(--accent)"
                            stroke-width="14"
                            stroke-linecap="round"
                            stroke-dasharray="${
                                circumference *
                                stat.pct /
                                100
                            } ${circumference}"
                            transform="rotate(-90 70 70)"
                        />

                        <text
                            x="70"
                            y="78"
                            text-anchor="middle"
                        >
                            ${stat.pct}%
                        </text>

                    </svg>

                    <p class="muted">

                        ${stat.c}
                        of
                        ${stat.total}
                        tasks completed

                    </p>

                </div>

            </section>


            <section class="card">

                <h2>
                    Tasks by Priority
                </h2>

                ${
                    priorityData.some(
                        item =>
                            item[1] > 0
                    )
                        ? horizontalBars(
                            priorityData,
                            'var(--indigo)'
                        )
                        : `
                            <p class="muted">
                                Add tasks to see this chart.
                            </p>
                        `
                }

            </section>


            <section class="card">

                <h2>
                    Tasks by Subject
                </h2>

                ${
                    subjectData.length
                        ? horizontalBars(
                            subjectData
                        )
                        : `
                            <p class="muted">
                                Add subjects to see this chart.
                            </p>
                        `
                }

            </section>


            <section class="card">

                <h2>
                    Weekly Productivity
                </h2>

                <p class="muted">
                    Tasks completed in the last 7 days
                </p>

                <div class="wk">

                    ${
                        days
                            .map(
                                ([label, number]) =>
                                    `

                                    <div class="col">

                                        <b>
                                            ${number}
                                        </b>

                                        <div class="track">

                                            <i
                                                style="
                                                    height:${
                                                        number /
                                                        maxValue(days) *
                                                        100
                                                    }%
                                                "
                                            ></i>

                                        </div>

                                        <small>
                                            ${label}
                                        </small>

                                    </div>

                                    `
                            )
                            .join('')
                    }

                </div>

            </section>

        </div>


        <section class="card">

            <h2>
                Productivity Summary
            </h2>

            <ul class="sum">

                <li>
                    You completed
                    ${stat.c}
                    out of
                    ${stat.total}
                    tasks.
                </li>

                <li>
                    You have
                    ${pl(
                        stat.up,
                        'upcoming deadline'
                    )}.
                </li>

                <li>
                    Your current task completion rate is
                    ${stat.pct}%.
                </li>

                <li>

                    ${
                        stat.od
                            ? `${pl(
                                stat.od,
                                'task'
                            )} overdue. Tackle these first.`
                            : 'No overdue tasks.'
                    }

                </li>

                <li>
                    You have
                    ${pl(
                        upcomingSessions,
                        'study session'
                    )}
                    planned ahead.
                </li>

            </ul>

        </section>

        `;
    }


    /* ================= Settings ================= */

    function settings() {

        const setting =
            S.settings;


        const checkSetting =
            (
                name,
                label
            ) =>
                `
                <div class="setrow">

                    <label>

                        <input
                            type="checkbox"
                            id="set_${name}"
                            ${
                                setting[name]
                                    ? 'checked'
                                    : ''
                            }
                        >

                        ${label}

                    </label>

                </div>
                `;


        return `

        <section class="card">

            <h2>
                Appearance
            </h2>

            <div
                class="setrow"
                role="radiogroup"
                aria-label="Theme"
            >

                <label>

                    <input
                        type="radio"
                        name="theme"
                        value="light"
                        ${
                            setting.theme !== 'dark'
                                ? 'checked'
                                : ''
                        }
                    >

                    ☀️ Light Mode

                </label>


                <label>

                    <input
                        type="radio"
                        name="theme"
                        value="dark"
                        ${
                            setting.theme === 'dark'
                                ? 'checked'
                                : ''
                        }
                    >

                    🌙 Dark Mode

                </label>

            </div>

        </section>


        <section class="card">

            <h2>
                Application
            </h2>

            ${checkSetting(
                'compact',
                'Compact mode'
            )}

            ${checkSetting(
                'showCompleted',
                'Show completed tasks'
            )}

            ${checkSetting(
                'confirmDelete',
                'Confirm before deleting'
            )}

        </section>


        <section class="card">

            <h2>
                Student Profile
            </h2>

            <div class="grid">

                <div class="field">

                    <label for="set_name">
                        Student Name
                    </label>

                    <input
                        id="set_name"
                        value="${esc(
                            setting.name
                        )}"
                        placeholder="Enter your name"
                    >

                </div>


                <div class="field">

                    <label for="set_course">
                        Course / Program
                    </label>

                    <input
                        id="set_course"
                        value="${esc(
                            setting.course
                        )}"
                        placeholder="Enter your course"
                    >

                </div>


                <div class="field">

                    <label for="set_year">
                        Year Level
                    </label>

                    <select id="set_year">

                        <option value="">
                            Select year level
                        </option>

                        ${options(
                            YEARS,
                            setting.year
                        )}

                    </select>

                </div>

            </div>

        </section>


        <div>

            <button
                class="btn primary"
                data-act="saveSettings"
            >
                Save Settings
            </button>

        </div>

        `;
    }


    /* ================= Router ================= */

    const PAGES = {

        dashboard: [
            'Dashboard',
            '🏠',
            dashboard
        ],

        tasks: [
            'My Tasks',
            '📝',
            tasks
        ],

        subjects: [
            'Subjects',
            '📚',
            subjects
        ],

        schedule: [
            'Study Schedule',
            '⏰',
            schedule
        ],

        notes: [
            'Notes',
            '🗒️',
            notes
        ],

        calendar: [
            'Calendar',
            '📅',
            calendar
        ],

        progress: [
            'Progress',
            '📊',
            progress
        ],

        settings: [
            'Settings',
            '⚙️',
            settings
        ]

    };


    let currentPage =
        'dashboard';


    function render() {

        const [
            title,
            ,
            pageFunction
        ] =
            PAGES[currentPage];


        $('#pageTitle').textContent =
            title;


        document.title =
            `${title} · StudyFlow`;


        $('#main').innerHTML =
            pageFunction();


        $('#nav').innerHTML =
            Object.entries(PAGES)
                .map(
                    ([key, [pageTitle, icon]]) =>
                        `
                        <a
                            href="#${key}"
                            ${
                                key === currentPage
                                    ? 'aria-current="page"'
                                    : ''
                            }
                        >

                            <span
                                aria-hidden="true"
                            >
                                ${icon}
                            </span>

                            ${pageTitle}

                        </a>
                        `
                )
                .join('');


        const name =
            S.settings.name.trim() ||
            'Student';


        const course =
            S.settings.course.trim();


        const year =
            S.settings.year;


        $('#profile').innerHTML = `

            <strong>
                ${esc(name)}
            </strong>

            ${
                course
                    ? esc(course)
                    : 'Course not set'
            }

            <br>

            ${
                year
                    ? esc(year)
                    : 'Year level not set'
            }

        `;
    }


    function route() {

        const page =
            location.hash.slice(1);


        currentPage =
            PAGES[page]
                ? page
                : 'dashboard';


        document.body.classList.remove(
            'nav-open'
        );


        render();

        applyPrefs();

        window.scrollTo(
            0,
            0
        );
    }


    function applyPrefs() {

        document.documentElement.dataset.theme =
            S.settings.theme;


        document.body.classList.toggle(
            'compact',
            !!S.settings.compact
        );


        $('#themeBtn').textContent =
            S.settings.theme === 'dark'
                ? '☀️'
                : '🌙';
    }


    /* ================= Actions ================= */

    const A = {

        close: closeModal,


        addTask:
            () => taskForm(),


        editTask:
            id =>
                taskForm(
                    find(
                        'tasks',
                        id
                    )
                ),


        delTask:
            id =>
                del(
                    'tasks',
                    id,
                    'Task'
                ),


        toggle: id => {

            const task =
                find(
                    'tasks',
                    id
                );


            if (!task) {
                return;
            }


            const wasCompleted =
                done(task);


            task.status =
                wasCompleted
                    ? 'Pending'
                    : 'Completed';


            task.completedAt =
                wasCompleted
                    ? ''
                    : today();


            save('tasks');

            render();

            toast(
                wasCompleted
                    ? 'Task moved back to pending.'
                    : 'Task marked as completed.'
            );
        },


        addSubject:
            () => subjectForm(),


        editSubject:
            id =>
                subjectForm(
                    find(
                        'subjects',
                        id
                    )
                ),


        delSubject:
            id =>
                del(
                    'subjects',
                    id,
                    'Subject'
                ),


        addSession:
            () => sessionForm(),


        editSession:
            id =>
                sessionForm(
                    find(
                        'sessions',
                        id
                    )
                ),


        delSession:
            id =>
                del(
                    'sessions',
                    id,
                    'Session'
                ),


        doneSession: id => {

            const session =
                find(
                    'sessions',
                    id
                );


            if (!session) {
                return;
            }


            session.done =
                !session.done;


            save('sessions');

            render();

            toast(
                session.done
                    ? 'Study session completed.'
                    : 'Study session reopened.'
            );
        },


        addNote:
            () => noteForm(),


        editNote:
            id =>
                noteForm(
                    find(
                        'notes',
                        id
                    )
                ),


        delNote:
            id =>
                del(
                    'notes',
                    id,
                    'Note'
                ),


        viewNote: id => {

            const note =
                find(
                    'notes',
                    id
                );


            if (!note) {
                return;
            }


            openModal(

                note.title,

                `

                <p>

                    ${chip(
                        note.subject
                    )}

                    <small>
                        · Created
                        ${fmtDate(
                            note.created
                        )}
                    </small>

                </p>


                <div class="note-body">

                    ${esc(
                        note.content
                    )}

                </div>


                <div>

                    ${
                        (note.tags || [])
                            .map(
                                tag =>
                                    `
                                    <span class="tag">
                                        #${esc(tag)}
                                    </span>
                                    `
                            )
                            .join('')
                    }

                </div>


                <div class="actions">

                    <button
                        class="btn"
                        data-act="close"
                    >
                        Close
                    </button>

                    <button
                        class="btn primary"
                        data-act="editNote"
                        data-id="${note.id}"
                    >
                        Edit
                    </button>

                </div>

                `
            );
        },


        pick: id => {

            cal.sel = id;

            render();
        },


        calPrev: () => {

            cal.m--;

            if (cal.m < 0) {

                cal.m = 11;
                cal.y--;
            }

            render();
        },


        calNext: () => {

            cal.m++;

            if (cal.m > 11) {

                cal.m = 0;
                cal.y++;
            }

            render();
        },


        calToday: () => {

            const date =
                new Date();

            cal.y =
                date.getFullYear();

            cal.m =
                date.getMonth();

            cal.sel =
                today();

            render();
        },


        toggleTheme: () => {

            S.settings.theme =
                S.settings.theme === 'dark'
                    ? 'light'
                    : 'dark';


            save('settings');

            applyPrefs();

            if (
                currentPage ===
                'settings'
            ) {
                render();
            }
        },


        saveSettings: () => {

            const theme =
                $('input[name=theme]:checked');


            Object.assign(
                S.settings,
                {

                    theme:
                        theme
                            ? theme.value
                            : 'light',

                    compact:
                        $('#set_compact')
                            .checked,

                    showCompleted:
                        $('#set_showCompleted')
                            .checked,

                    confirmDelete:
                        $('#set_confirmDelete')
                            .checked,

                    name:
                        $('#set_name')
                            .value
                            .trim(),

                    course:
                        $('#set_course')
                            .value
                            .trim(),

                    year:
                        $('#set_year')
                            .value
                }
            );


            save('settings');

            applyPrefs();

            render();

            toast(
                'Settings saved.'
            );
        }

    };


    /* ================= Events ================= */

    document.addEventListener(
        'click',
        event => {

            if (
                event.target.id ===
                'modal'
            ) {

                closeModal();

                return;
            }


            const button =
                event.target.closest(
                    '[data-act]'
                );


            if (
                button &&
                A[button.dataset.act]
            ) {

                A[
                    button.dataset.act
                ](
                    button.dataset.id
                );
            }

        }
    );


    document.addEventListener(
        'input',
        event => {

            const field =
                event.target.dataset.f;


            if (!field) {
                return;
            }


            F[field] =
                event.target.value;


            const list =
                $('#list');


            if (list) {

                list.innerHTML =
                    currentPage === 'tasks'
                        ? taskTable()
                        : notesGrid();
            }
        }
    );


    document.addEventListener(
        'change',
        event => {

            const field =
                event.target.dataset.f;


            if (!field) {
                return;
            }


            F[field] =
                event.target.value;


            const list =
                $('#list');


            if (list) {

                list.innerHTML =
                    currentPage === 'tasks'
                        ? taskTable()
                        : notesGrid();
            }
        }
    );


    document.addEventListener(
        'keydown',
        event => {

            if (
                event.key ===
                'Escape'
            ) {

                if (
                    !$('#modal').hidden
                ) {
                    closeModal();
                }

                document.body.classList.remove(
                    'nav-open'
                );
            }
        }
    );


    $('#menuBtn').addEventListener(
        'click',
        () => {

            document.body.classList.toggle(
                'nav-open'
            );
        }
    );


    $('#scrim').addEventListener(
        'click',
        () => {

            document.body.classList.remove(
                'nav-open'
            );
        }
    );


    window.addEventListener(
        'hashchange',
        route
    );


    $('#year').textContent =
        new Date().getFullYear();


    applyPrefs();

    route();

})();