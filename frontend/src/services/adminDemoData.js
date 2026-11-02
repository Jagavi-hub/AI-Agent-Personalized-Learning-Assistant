/**
 * LearnAI Admin Console — Isolated Demo Data Store
 * Provides rich, realistic, internally consistent fictional faculty and student records
 * for demonstration purposes. Never modifies or connects to the real production database (learnai.db).
 */

const INITIAL_DEMO_STUDENTS = [
  {
    id: 101,
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Computer Science & Engineering',
    year: '3rd Year',
    semester: '6th Semester',
    current_skill_level: 'Intermediate',
    preferred_learning_style: 'Visual & Practical',
    storage_used_bytes: 25690112, // ~24.5 MB
    custom_quota_bytes: 52428800, // 50 MB
    quota_bytes: 52428800,
    warning_status: 'normal',
    cleanup_deadline: null,
    created_at: '2025-08-15T10:30:00Z',
    last_login: '2026-10-15T14:22:10Z',
    enrolled_subjects: ['Machine Learning', 'Compiler Design', 'Artificial Intelligence'],
    quiz_attempts_count: 6,
    quiz_average_score: 82.5,
    courses: [
      { id: 1, code: 'CS601', name: 'Machine Learning', semester: '6th Semester', department: 'Computer Science & Engineering' },
      { id: 2, code: 'CS602', name: 'Compiler Design', semester: '6th Semester', department: 'Computer Science & Engineering' },
      { id: 3, code: 'AI501', name: 'Artificial Intelligence', semester: '5th Semester', department: 'Computer Science & Engineering' },
    ],
    documents: [
      { id: 1001, filename: 'ML_Unit1_SupervisedLearning_Notes.pdf', file_size: 13002342, upload_date: '2026-09-10T11:20:00Z', is_course_material: false, subject_code: 'CS601' },
      { id: 1002, filename: 'Compiler_Grammars_Assignment_Draft.pdf', file_size: 8493470, upload_date: '2026-09-18T14:15:00Z', is_course_material: false, subject_code: 'CS602' },
      { id: 1003, filename: 'AI_Search_Algorithms_Summary.pdf', file_size: 4194300, upload_date: '2026-10-02T09:45:00Z', is_course_material: false, subject_code: 'AI501' },
    ],
    quiz_attempts: [
      { id: 201, topic: 'Supervised vs Unsupervised Algorithms', difficulty: 'Intermediate', score: 85, created_at: '2026-10-12T16:00:00Z' },
      { id: 202, topic: 'Lexical Analysis & DFA State Machines', difficulty: 'Intermediate', score: 80, created_at: '2026-10-14T11:30:00Z' },
    ],
    recent_notifications: [
      { id: 301, user_id: 101, type: 'announcement', title: 'Midterm Practice Quizzes Available', message: 'Practice questions for CS601 and CS602 have been uploaded.', is_read: true, created_at: '2026-10-10T09:00:00Z' },
    ],
    recent_feedbacks: [],
  },
  {
    id: 102,
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Data Science & Artificial Intelligence',
    year: '3rd Year',
    semester: '6th Semester',
    current_skill_level: 'Advanced',
    preferred_learning_style: 'Hands-on Projects',
    storage_used_bytes: 45980000, // ~43.8 MB (88% -> approaching)
    custom_quota_bytes: 52428800,
    quota_bytes: 52428800,
    warning_status: 'approaching_quota',
    cleanup_deadline: null,
    created_at: '2025-08-16T11:15:00Z',
    last_login: '2026-10-16T08:45:00Z',
    enrolled_subjects: ['Big Data Analytics', 'Deep Learning'],
    quiz_attempts_count: 8,
    quiz_average_score: 88.0,
    courses: [
      { id: 4, code: 'DS401', name: 'Big Data Analytics', semester: '6th Semester', department: 'Data Science' },
      { id: 5, code: 'ML601', name: 'Deep Learning', semester: '6th Semester', department: 'Data Science' },
    ],
    documents: [
      { id: 1004, filename: 'BigData_Hadoop_MapReduce_Pipeline.pdf', file_size: 19084000, upload_date: '2026-08-20T10:00:00Z', is_course_material: false, subject_code: 'DS401' },
      { id: 1005, filename: 'DeepLearning_ResNet_Architectures.pdf', file_size: 22696000, upload_date: '2026-09-12T15:30:00Z', is_course_material: false, subject_code: 'ML601' },
      { id: 1006, filename: 'Spark_PySpark_Lab_Report.pdf', file_size: 4200000, upload_date: '2026-10-05T12:00:00Z', is_course_material: false, subject_code: 'DS401' },
    ],
    quiz_attempts: [
      { id: 203, topic: 'Convolutional Neural Networks & Backprop', difficulty: 'Advanced', score: 92, created_at: '2026-10-11T14:20:00Z' },
      { id: 204, topic: 'HDFS Replication & NameNode Failover', difficulty: 'Intermediate', score: 84, created_at: '2026-10-13T10:15:00Z' },
    ],
    recent_notifications: [
      { id: 302, user_id: 102, type: 'quota_alert', title: 'Storage Quota Approaching Limit', message: 'You have consumed 88% of your 50 MB allocation. Consider removing old PDFs.', is_read: false, created_at: '2026-10-14T08:00:00Z' },
    ],
    recent_feedbacks: [
      { id: 401, student_id: 102, subject: 'Storage Quota Limit Warning — Need 25 MB Extension for Capstone', status: 'open', rating: 4, created_at: '2026-10-15T09:30:00Z' },
    ],
  },
  {
    id: 103,
    name: 'Rohan Verma',
    email: 'rohan.verma@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Computer Science & Engineering',
    year: '4th Year',
    semester: '8th Semester',
    current_skill_level: 'Advanced',
    preferred_learning_style: 'Research & Theoretical',
    storage_used_bytes: 59139686, // ~56.4 MB (113% -> over quota)
    custom_quota_bytes: 52428800,
    quota_bytes: 52428800,
    warning_status: 'over_quota',
    cleanup_deadline: '2026-11-03T00:00:00Z', // 18 days remaining
    days_elapsed: 12,
    created_at: '2025-01-10T09:00:00Z',
    last_login: '2026-10-15T18:10:00Z',
    enrolled_subjects: ['Distributed Systems', 'Cloud Computing'],
    quiz_attempts_count: 12,
    quiz_average_score: 91.2,
    courses: [
      { id: 6, code: 'CS701', name: 'Distributed Systems', semester: '8th Semester', department: 'Computer Science' },
      { id: 7, code: 'CS702', name: 'Cloud Computing', semester: '8th Semester', department: 'Computer Science' },
    ],
    documents: [
      { id: 1007, filename: 'Raft_Consensus_Protocol_Full_Spec.pdf', file_size: 29800000, upload_date: '2026-07-14T10:00:00Z', is_course_material: false, subject_code: 'CS701' },
      { id: 1008, filename: 'Kubernetes_Cluster_Architecture_Lab.pdf', file_size: 18839686, upload_date: '2026-08-01T12:00:00Z', is_course_material: false, subject_code: 'CS702' },
      { id: 1009, filename: 'Distributed_Transactions_2PC.pdf', file_size: 10500000, upload_date: '2026-08-25T14:30:00Z', is_course_material: false, subject_code: 'CS701' },
    ],
    quiz_attempts: [
      { id: 205, topic: 'Byzantine Fault Tolerance & Paxos', difficulty: 'Advanced', score: 95, created_at: '2026-10-09T17:00:00Z' },
    ],
    recent_notifications: [
      { id: 303, user_id: 103, type: 'storage_warning', title: 'Storage Retention Warning: Quota Exceeded', message: 'Your storage has exceeded 50 MB. 18 days remaining in 30-day grace period.', is_read: true, created_at: '2026-10-04T00:00:00Z' },
    ],
    recent_feedbacks: [
      { id: 402, student_id: 103, subject: 'Clarification on AI Tutor explanation for Raft Consensus election timeout', status: 'awaiting_student', rating: 5, created_at: '2026-10-13T11:00:00Z' },
    ],
  },
  {
    id: 104,
    name: 'Ananya Iyer',
    email: 'ananya.iyer@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Information Technology',
    year: '2nd Year',
    semester: '4th Semester',
    current_skill_level: 'Intermediate',
    preferred_learning_style: 'Visual & Conceptual',
    storage_used_bytes: 65116569, // ~62.1 MB (124% -> grace period expired)
    custom_quota_bytes: 52428800,
    quota_bytes: 52428800,
    warning_status: 'over_quota',
    cleanup_deadline: '2026-10-15T00:00:00Z', // 0 days remaining (Expired)
    days_elapsed: 31,
    created_at: '2025-07-20T14:00:00Z',
    last_login: '2026-10-14T16:30:00Z',
    enrolled_subjects: ['Database Management Systems', 'Computer Networks'],
    quiz_attempts_count: 5,
    quiz_average_score: 74.5,
    courses: [
      { id: 8, code: 'IT401', name: 'Database Management Systems', semester: '4th Semester', department: 'Information Technology' },
      { id: 9, code: 'IT402', name: 'Computer Networks', semester: '4th Semester', department: 'Information Technology' },
    ],
    documents: [
      { id: 1010, filename: 'SQL_Subqueries_Practice_Exercises.pdf', file_size: 13631488, upload_date: '2026-06-01T09:00:00Z', is_course_material: false, subject_code: 'IT401' },
      { id: 1011, filename: 'DBMS_Transaction_ACID_Properties.pdf', file_size: 27787264, upload_date: '2026-07-10T11:00:00Z', is_course_material: false, subject_code: 'IT401' },
      { id: 1012, filename: 'Computer_Networks_TCP_IP_Handshake.pdf', file_size: 23697817, upload_date: '2026-08-15T13:00:00Z', is_course_material: false, subject_code: 'IT402' },
    ],
    quiz_attempts: [
      { id: 206, topic: 'Relational Algebra & Normalization (3NF/BCNF)', difficulty: 'Intermediate', score: 72, created_at: '2026-10-08T15:00:00Z' },
    ],
    recent_notifications: [
      { id: 304, user_id: 104, type: 'cleanup_warning', title: 'Grace Period Expired — Automated Cleanup Imminent', message: 'Your 30-day retention grace period has ended. Oldest student files are queued for cleanup.', is_read: false, created_at: '2026-10-15T00:00:00Z' },
    ],
    recent_feedbacks: [
      { id: 403, student_id: 104, subject: 'Retention grace period deadline query', status: 'open', rating: 3, created_at: '2026-10-15T15:20:00Z' },
    ],
  },
  {
    id: 105,
    name: 'Karthik Nair',
    email: 'karthik.nair@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Electrical & Electronics Engineering',
    year: '3rd Year',
    semester: '5th Semester',
    current_skill_level: 'Intermediate',
    preferred_learning_style: 'Mathematical & Analytical',
    storage_used_bytes: 33554432, // 32.0 MB / 100 MB (32%)
    custom_quota_bytes: 104857600, // 100 MB custom
    quota_bytes: 104857600,
    warning_status: 'normal',
    cleanup_deadline: null,
    created_at: '2025-08-10T08:00:00Z',
    last_login: '2026-10-16T07:15:00Z',
    enrolled_subjects: ['Control Systems', 'Power Electronics'],
    quiz_attempts_count: 4,
    quiz_average_score: 79.0,
    courses: [
      { id: 10, code: 'EE501', name: 'Control Systems', semester: '5th Semester', department: 'Electrical Engineering' },
      { id: 11, code: 'EE502', name: 'Power Electronics', semester: '5th Semester', department: 'Electrical Engineering' },
    ],
    documents: [
      { id: 1013, filename: 'Control_Systems_RootLocus_Formula_Sheet.pdf', file_size: 18874368, upload_date: '2026-09-01T10:00:00Z', is_course_material: false, subject_code: 'EE501' },
      { id: 1014, filename: 'Power_Electronics_Inverters_PWM.pdf', file_size: 14680064, upload_date: '2026-09-20T11:00:00Z', is_course_material: false, subject_code: 'EE502' },
    ],
    quiz_attempts: [
      { id: 207, topic: 'Bode Plots & Gain/Phase Margins', difficulty: 'Intermediate', score: 78, created_at: '2026-10-10T12:00:00Z' },
    ],
    recent_notifications: [
      { id: 305, user_id: 105, type: 'account_notice', title: 'Storage Quota Updated', message: 'Your LearnAI storage quota has been adjusted to 100.0 MB by an administrator.', is_read: true, created_at: '2026-09-15T10:00:00Z' },
    ],
    recent_feedbacks: [
      { id: 404, student_id: 105, subject: 'Issue downloading Control Systems Root Locus formula sheet', status: 'resolved', rating: 5, created_at: '2026-09-25T14:00:00Z' },
    ],
  },
  {
    id: 106,
    name: 'Sneha Mukherjee',
    email: 'sneha.mukherjee@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Computer Science & Engineering',
    year: '1st Year',
    semester: '2nd Semester',
    current_skill_level: 'Beginner',
    preferred_learning_style: 'Step-by-step Tutorials',
    storage_used_bytes: 6500000, // ~6.2 MB (12%)
    custom_quota_bytes: 52428800,
    quota_bytes: 52428800,
    warning_status: 'normal',
    cleanup_deadline: null,
    created_at: '2026-01-15T09:30:00Z',
    last_login: '2026-10-15T19:00:00Z',
    enrolled_subjects: ['Data Structures', 'Discrete Mathematics'],
    quiz_attempts_count: 3,
    quiz_average_score: 95.0,
    courses: [
      { id: 12, code: 'CS101', name: 'Data Structures', semester: '2nd Semester', department: 'Computer Science' },
      { id: 13, code: 'MA102', name: 'Discrete Mathematics', semester: '2nd Semester', department: 'Mathematics' },
    ],
    documents: [
      { id: 1015, filename: 'Binary_Search_Trees_Visual_Guide.pdf', file_size: 6500000, upload_date: '2026-09-28T10:00:00Z', is_course_material: false, subject_code: 'CS101' },
    ],
    quiz_attempts: [
      { id: 208, topic: 'Stack, Queue, & Linked List Operations', difficulty: 'Beginner', score: 96, created_at: '2026-10-11T16:00:00Z' },
    ],
    recent_notifications: [],
    recent_feedbacks: [],
  },
  {
    id: 107,
    name: 'Vikramaditya Rao',
    email: 'vikram.rao@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Mechanical Engineering & Robotics',
    year: '4th Year',
    semester: '7th Semester',
    current_skill_level: 'Advanced',
    preferred_learning_style: 'Simulation & Design',
    storage_used_bytes: 50855936, // ~48.5 MB (97% -> approaching)
    custom_quota_bytes: 52428800,
    quota_bytes: 52428800,
    warning_status: 'approaching_quota',
    cleanup_deadline: null,
    created_at: '2025-02-12T10:00:00Z',
    last_login: '2026-10-14T21:40:00Z',
    enrolled_subjects: ['Robotics & Kinematics', 'Finite Element Analysis'],
    quiz_attempts_count: 9,
    quiz_average_score: 85.0,
    courses: [
      { id: 14, code: 'ME701', name: 'Robotics & Kinematics', semester: '7th Semester', department: 'Mechanical Engineering' },
      { id: 15, code: 'ME702', name: 'Finite Element Analysis', semester: '7th Semester', department: 'Mechanical Engineering' },
    ],
    documents: [
      { id: 1016, filename: 'Robotics_Inverse_Kinematics_Calculations.pdf', file_size: 33030144, upload_date: '2026-08-11T14:00:00Z', is_course_material: false, subject_code: 'ME701' },
      { id: 1017, filename: 'FEA_Stress_Tensor_Formulations.pdf', file_size: 17825792, upload_date: '2026-09-05T16:00:00Z', is_course_material: false, subject_code: 'ME702' },
    ],
    quiz_attempts: [
      { id: 209, topic: 'Denavit-Hartenberg Robot Parameters', difficulty: 'Advanced', score: 88, created_at: '2026-10-12T13:00:00Z' },
    ],
    recent_notifications: [
      { id: 306, user_id: 107, type: 'quota_alert', title: 'Storage Nearing Allocation (97%)', message: 'You have only 1.5 MB remaining. Clean up unused documents to avoid upload restrictions.', is_read: false, created_at: '2026-10-15T09:00:00Z' },
    ],
    recent_feedbacks: [],
  },
  {
    id: 108,
    name: 'Divya Sundaram',
    email: 'divya.sundaram@example.com',
    role: 'student',
    status: 'suspended',
    is_admin: false,
    department: 'Computer Science & Engineering',
    year: '3rd Year',
    semester: '6th Semester',
    current_skill_level: 'Intermediate',
    preferred_learning_style: 'Visual & Practical',
    storage_used_bytes: 16567500, // ~15.8 MB
    custom_quota_bytes: 52428800,
    quota_bytes: 52428800,
    warning_status: 'normal',
    cleanup_deadline: null,
    created_at: '2025-08-18T10:00:00Z',
    last_login: '2026-10-01T11:00:00Z',
    enrolled_subjects: ['Machine Learning', 'Compiler Design'],
    quiz_attempts_count: 7,
    quiz_average_score: 68.0,
    courses: [
      { id: 1, code: 'CS601', name: 'Machine Learning', semester: '6th Semester', department: 'Computer Science & Engineering' },
    ],
    documents: [
      { id: 1018, filename: 'Neural_Networks_Backpropagation_Notes.pdf', file_size: 16567500, upload_date: '2026-08-25T10:00:00Z', is_course_material: false, subject_code: 'CS601' },
    ],
    quiz_attempts: [
      { id: 210, topic: 'Loss Functions & Gradient Descent', difficulty: 'Intermediate', score: 65, created_at: '2026-09-30T15:00:00Z' },
    ],
    recent_notifications: [
      { id: 307, user_id: 108, type: 'account_notice', title: 'Account Temporarily Suspended', message: 'Your account was suspended by an administrator. Reason: Academic integrity inquiry under review.', is_read: false, created_at: '2026-10-02T10:00:00Z' },
    ],
    recent_feedbacks: [],
  },
  {
    id: 109,
    name: 'Mohammad Tariq',
    email: 'm.tariq@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Cybersecurity & Digital Forensics',
    year: '4th Year',
    semester: '8th Semester',
    current_skill_level: 'Expert',
    preferred_learning_style: 'Hands-on Labs',
    storage_used_bytes: 117859942, // ~112.4 MB / 150 MB (75%)
    custom_quota_bytes: 157286400, // 150 MB research quota
    quota_bytes: 157286400,
    warning_status: 'normal',
    cleanup_deadline: null,
    created_at: '2025-01-08T09:00:00Z',
    last_login: '2026-10-16T09:10:00Z',
    enrolled_subjects: ['Cryptography', 'Network Penetration Testing'],
    quiz_attempts_count: 14,
    quiz_average_score: 94.0,
    courses: [
      { id: 16, code: 'CY801', name: 'Cryptography', semester: '8th Semester', department: 'Cybersecurity' },
      { id: 17, code: 'CY802', name: 'Network Penetration Testing', semester: '8th Semester', department: 'Cybersecurity' },
    ],
    documents: [
      { id: 1019, filename: 'Elliptic_Curve_Cryptography_Proof.pdf', file_size: 47395635, upload_date: '2026-07-20T10:00:00Z', is_course_material: false, subject_code: 'CY801' },
      { id: 1020, filename: 'Buffer_Overflow_Exploit_Mitigation.pdf', file_size: 40055603, upload_date: '2026-08-10T12:00:00Z', is_course_material: false, subject_code: 'CY802' },
      { id: 1021, filename: 'Wireshark_Packet_Analysis_Lab.pdf', file_size: 30408704, upload_date: '2026-09-14T14:00:00Z', is_course_material: false, subject_code: 'CY802' },
    ],
    quiz_attempts: [
      { id: 211, topic: 'RSA Key Generation & Prime Factorization', difficulty: 'Advanced', score: 98, created_at: '2026-10-11T18:00:00Z' },
    ],
    recent_notifications: [],
    recent_feedbacks: [
      { id: 405, student_id: 109, subject: 'Feedback on Cryptography practice quiz questions', status: 'resolved', rating: 5, created_at: '2026-10-12T14:00:00Z' },
    ],
  },
  {
    id: 110,
    name: 'Meera Krishnan',
    email: 'meera.krishnan@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Artificial Intelligence & Machine Learning',
    year: '2nd Year',
    semester: '3rd Semester',
    current_skill_level: 'Intermediate',
    preferred_learning_style: 'Visual & Interactive',
    storage_used_bytes: 55784243, // ~53.2 MB (106% -> over quota)
    custom_quota_bytes: 52428800,
    quota_bytes: 52428800,
    warning_status: 'over_quota',
    cleanup_deadline: '2026-11-07T00:00:00Z', // 22 days remaining
    days_elapsed: 8,
    created_at: '2025-09-01T10:00:00Z',
    last_login: '2026-10-16T08:00:00Z',
    enrolled_subjects: ['Foundations of AI', 'Scientific Computing'],
    quiz_attempts_count: 6,
    quiz_average_score: 89.0,
    courses: [
      { id: 18, code: 'AI301', name: 'Foundations of AI', semester: '3rd Semester', department: 'Artificial Intelligence' },
    ],
    documents: [
      { id: 1022, filename: 'Heuristic_Search_A_Star_Implementation.pdf', file_size: 33554432, upload_date: '2026-09-02T11:00:00Z', is_course_material: false, subject_code: 'AI301' },
      { id: 1023, filename: 'NumPy_Optimization_Notes_Unit2.pdf', file_size: 22229811, upload_date: '2026-09-24T15:00:00Z', is_course_material: false, subject_code: 'AI301' },
    ],
    quiz_attempts: [
      { id: 212, topic: 'A* Heuristic Admissibility & Consistency', difficulty: 'Intermediate', score: 90, created_at: '2026-10-13T14:00:00Z' },
    ],
    recent_notifications: [
      { id: 308, user_id: 110, type: 'storage_warning', title: 'Storage Over Limit Notice', message: 'You are using 53.2 MB of your 50.0 MB quota. 22 days left to resolve.', is_read: false, created_at: '2026-10-08T00:00:00Z' },
    ],
    recent_feedbacks: [],
  },
  {
    id: 111,
    name: 'Aditya Sen',
    email: 'aditya.sen@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Computer Science & Engineering',
    year: '2nd Year',
    semester: '4th Semester',
    current_skill_level: 'Intermediate',
    preferred_learning_style: 'Problem Solving',
    storage_used_bytes: 20342374, // ~19.4 MB (39%)
    custom_quota_bytes: 52428800,
    quota_bytes: 52428800,
    warning_status: 'normal',
    cleanup_deadline: null,
    created_at: '2025-07-28T12:00:00Z',
    last_login: '2026-10-15T12:30:00Z',
    enrolled_subjects: ['Operating Systems', 'Algorithms'],
    quiz_attempts_count: 5,
    quiz_average_score: 83.0,
    courses: [
      { id: 19, code: 'CS401', name: 'Operating Systems', semester: '4th Semester', department: 'Computer Science' },
    ],
    documents: [
      { id: 1024, filename: 'OS_Virtual_Memory_Paging_Algorithms.pdf', file_size: 11953766, upload_date: '2026-08-30T10:00:00Z', is_course_material: false, subject_code: 'CS401' },
      { id: 1025, filename: 'Dynamic_Programming_Knapsack_Greedy.pdf', file_size: 8388608, upload_date: '2026-09-18T13:00:00Z', is_course_material: false, subject_code: 'CS401' },
    ],
    quiz_attempts: [
      { id: 213, topic: 'Page Replacement (LRU, FIFO, Optimal)', difficulty: 'Intermediate', score: 84, created_at: '2026-10-07T11:00:00Z' },
    ],
    recent_notifications: [],
    recent_feedbacks: [],
  },
  {
    id: 112,
    name: 'Pooja Hegde',
    email: 'pooja.hegde@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Information Technology',
    year: '3rd Year',
    semester: '6th Semester',
    current_skill_level: 'Intermediate',
    preferred_learning_style: 'Interactive Coding',
    storage_used_bytes: 2202009, // ~2.1 MB (4%)
    custom_quota_bytes: 52428800,
    quota_bytes: 52428800,
    warning_status: 'normal',
    cleanup_deadline: null,
    created_at: '2025-08-22T14:00:00Z',
    last_login: '2026-10-16T06:00:00Z',
    enrolled_subjects: ['Web Technologies', 'Information Security'],
    quiz_attempts_count: 2,
    quiz_average_score: 75.0,
    courses: [
      { id: 20, code: 'IT601', name: 'Web Technologies', semester: '6th Semester', department: 'Information Technology' },
    ],
    documents: [
      { id: 1026, filename: 'REST_API_JWT_Authentication_Guide.pdf', file_size: 2202009, upload_date: '2026-10-01T09:00:00Z', is_course_material: false, subject_code: 'IT601' },
    ],
    quiz_attempts: [],
    recent_notifications: [],
    recent_feedbacks: [],
  },
  {
    id: 113,
    name: 'Rahul Choudhury',
    email: 'rahul.choudhury@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Data Science',
    year: '1st Year',
    semester: '1st Semester',
    current_skill_level: 'Beginner',
    preferred_learning_style: 'Practical Examples',
    storage_used_bytes: 0,
    custom_quota_bytes: 52428800,
    quota_bytes: 52428800,
    warning_status: 'normal',
    cleanup_deadline: null,
    created_at: '2026-09-01T11:00:00Z',
    last_login: '2026-10-14T09:00:00Z',
    enrolled_subjects: ['Probability & Statistics'],
    quiz_attempts_count: 1,
    quiz_average_score: 70.0,
    courses: [],
    documents: [],
    quiz_attempts: [],
    recent_notifications: [],
    recent_feedbacks: [],
  },
  {
    id: 114,
    name: 'Sanya Mirza',
    email: 'sanya.mirza@example.com',
    role: 'student',
    status: 'active',
    is_admin: false,
    department: 'Electrical Engineering',
    year: '4th Year',
    semester: '7th Semester',
    current_skill_level: 'Advanced',
    preferred_learning_style: 'Hardware Diagrams',
    storage_used_bytes: 60817408, // ~58.0 MB (116% -> 5 days remaining)
    custom_quota_bytes: 52428800,
    quota_bytes: 52428800,
    warning_status: 'over_quota',
    cleanup_deadline: '2026-10-21T00:00:00Z', // 5 days remaining
    days_elapsed: 25,
    created_at: '2025-02-05T09:00:00Z',
    last_login: '2026-10-15T15:00:00Z',
    enrolled_subjects: ['Embedded Systems', 'VLSI Design'],
    quiz_attempts_count: 11,
    quiz_average_score: 92.0,
    courses: [
      { id: 21, code: 'EE701', name: 'Embedded Systems', semester: '7th Semester', department: 'Electrical Engineering' },
    ],
    documents: [
      { id: 1027, filename: 'ARM_Cortex_M4_Registers_Reference.pdf', file_size: 35651584, upload_date: '2026-07-15T10:00:00Z', is_course_material: false, subject_code: 'EE701' },
      { id: 1028, filename: 'CMOS_Inverter_Propagation_Delay_Layout.pdf', file_size: 25165824, upload_date: '2026-08-10T14:00:00Z', is_course_material: false, subject_code: 'EE701' },
    ],
    quiz_attempts: [
      { id: 214, topic: 'Interrupt Vectors & Nested NVIC Priority', difficulty: 'Advanced', score: 94, created_at: '2026-10-09T14:00:00Z' },
    ],
    recent_notifications: [
      { id: 309, user_id: 114, type: 'cleanup_warning', title: '5 Days Left: Storage Quota Exceeded', message: 'You have 5 days remaining before automated cleanup reclaims excess storage.', is_read: false, created_at: '2026-10-14T08:00:00Z' },
    ],
    recent_feedbacks: [],
  },
];

const INITIAL_DEMO_FEEDBACKS = [
  {
    id: 501,
    student_id: 102,
    student_name: 'Priya Patel',
    student_email: 'priya.patel@example.com',
    subject: 'Storage Quota Limit Warning — Need 25 MB Extension for Capstone',
    category: 'Storage & Account',
    rating: 4,
    comment: 'Dear Faculty, I received a warning that I have reached 88% of my 50 MB quota. I have three required Deep Learning lab manuals to upload this week. Could my quota be temporarily adjusted to 100 MB?',
    status: 'open',
    created_at: '2026-10-15T09:30:00Z',
    updated_at: '2026-10-15T09:30:00Z',
    replies: [
      {
        id: 601,
        feedback_id: 501,
        sender_id: 102,
        sender_role: 'student',
        sender_name: 'Priya Patel',
        message: 'Dear Faculty, I received a warning that I have reached 88% of my 50 MB quota. I have three required Deep Learning lab manuals to upload this week. Could my quota be temporarily adjusted to 100 MB?',
        created_at: '2026-10-15T09:30:00Z',
      },
    ],
  },
  {
    id: 502,
    student_id: 103,
    student_name: 'Rohan Verma',
    student_email: 'rohan.verma@example.com',
    subject: 'Clarification on AI Tutor explanation for Raft Consensus election timeout',
    category: 'AI Tutor & Knowledge Base',
    rating: 5,
    comment: 'The AI assistant explained leader election timeout, but in the quiz for CS701, question 3 indicated randomized timer between 150-300ms is standard. Could you confirm if LearnAI curriculum uses the Ongaro 2014 paper specification?',
    status: 'awaiting_student',
    created_at: '2026-10-13T11:00:00Z',
    updated_at: '2026-10-14T15:20:00Z',
    replies: [
      {
        id: 602,
        feedback_id: 502,
        sender_id: 103,
        sender_role: 'student',
        sender_name: 'Rohan Verma',
        message: 'The AI assistant explained leader election timeout, but in the quiz for CS701, question 3 indicated randomized timer between 150-300ms is standard. Could you confirm if LearnAI curriculum uses the Ongaro 2014 paper specification?',
        created_at: '2026-10-13T11:00:00Z',
      },
      {
        id: 603,
        feedback_id: 502,
        sender_id: 999,
        sender_role: 'admin',
        sender_name: 'Faculty Administrator',
        message: 'Hello Rohan, yes, the LearnAI knowledge retrieval engine is grounded in Diego Ongaro’s 2014 Stanford doctoral thesis. The randomized election timeout between 150ms and 300ms ensures split votes are resolved with high probability. Review Section 5.2 of the lecture PDF.',
        created_at: '2026-10-14T15:20:00Z',
      },
    ],
  },
  {
    id: 503,
    student_id: 105,
    student_name: 'Karthik Nair',
    student_email: 'karthik.nair@example.com',
    subject: 'Issue downloading Control Systems Root Locus formula sheet',
    category: 'Platform Navigation',
    rating: 5,
    comment: 'The PDF download button gave an error yesterday during the lab.',
    status: 'resolved',
    created_at: '2026-09-25T14:00:00Z',
    updated_at: '2026-09-26T10:15:00Z',
    replies: [
      {
        id: 604,
        feedback_id: 503,
        sender_id: 105,
        sender_role: 'student',
        sender_name: 'Karthik Nair',
        message: 'The PDF download button gave an error yesterday during the lab.',
        created_at: '2026-09-25T14:00:00Z',
      },
      {
        id: 605,
        feedback_id: 503,
        sender_id: 999,
        sender_role: 'admin',
        sender_name: 'Faculty Administrator',
        message: 'Hi Karthik, the file indexing cache has been refreshed and the download stream verified. Please try downloading again from the Knowledge Base.',
        created_at: '2026-09-25T16:30:00Z',
      },
      {
        id: 606,
        feedback_id: 503,
        sender_id: 105,
        sender_role: 'student',
        sender_name: 'Karthik Nair',
        message: 'Thank you Professor! It downloaded quickly and cleanly now.',
        created_at: '2026-09-26T10:15:00Z',
      },
    ],
  },
  {
    id: 504,
    student_id: 104,
    student_name: 'Ananya Iyer',
    student_email: 'ananya.iyer@example.com',
    subject: 'Retention grace period deadline query',
    category: 'Storage & Retention',
    rating: 3,
    comment: 'I see a red notice stating my 30-day grace period has expired. Which files will be affected during the cleanup?',
    status: 'open',
    created_at: '2026-10-15T15:20:00Z',
    updated_at: '2026-10-15T15:20:00Z',
    replies: [
      {
        id: 607,
        feedback_id: 504,
        sender_id: 104,
        sender_role: 'student',
        sender_name: 'Ananya Iyer',
        message: 'I see a red notice stating my 30-day grace period has expired. Which files will be affected during the cleanup?',
        created_at: '2026-10-15T15:20:00Z',
      },
    ],
  },
  {
    id: 505,
    student_id: 109,
    student_name: 'Mohammad Tariq',
    student_email: 'm.tariq@example.com',
    subject: 'Feedback on Cryptography practice quiz questions',
    category: 'Academic Assessment',
    rating: 5,
    comment: 'The elliptic curve quiz questions were very rigorous and helped me prepare for the midterm.',
    status: 'resolved',
    created_at: '2026-10-12T14:00:00Z',
    updated_at: '2026-10-13T09:00:00Z',
    replies: [
      {
        id: 608,
        feedback_id: 505,
        sender_id: 109,
        sender_role: 'student',
        sender_name: 'Mohammad Tariq',
        message: 'The elliptic curve quiz questions were very rigorous and helped me prepare for the midterm.',
        created_at: '2026-10-12T14:00:00Z',
      },
      {
        id: 609,
        feedback_id: 505,
        sender_id: 999,
        sender_role: 'admin',
        sender_name: 'Faculty Administrator',
        message: 'Great job on scoring 98% on your attempt, Mohammad! Keep up the excellent work.',
        created_at: '2026-10-13T09:00:00Z',
      },
    ],
  },
];

const INITIAL_DEMO_ALERTS = [
  {
    id: 701,
    user_id: 101,
    title: 'Midterm Practice Quizzes Available Across All Engineering Departments',
    message: 'Faculty instructors have uploaded new formative assessments and topic reviews in the Quiz Practice section.',
    type: 'announcement',
    category: 'announcement',
    is_read: true,
    created_at: '2026-10-10T09:00:00Z',
  },
  {
    id: 702,
    user_id: 103,
    title: 'Storage Advisory: Free Up Unused PDF Uploads Ahead of End-of-Semester',
    message: 'Accounts exceeding 50 MB should review their Knowledge Base documents to prevent retention cleanups.',
    type: 'quota_alert',
    category: 'quota_alert',
    is_read: false,
    created_at: '2026-10-12T11:30:00Z',
  },
  {
    id: 703,
    user_id: 104,
    title: 'System Notice: Scheduled Database Maintenance Window Sunday 2:00 AM',
    message: 'LearnAI will undergo a 15-minute maintenance window for index optimization this Sunday at 2:00 AM.',
    type: 'system_notice',
    category: 'system_notice',
    is_read: true,
    created_at: '2026-10-14T14:00:00Z',
  },
];

const INITIAL_DEMO_AUDIT_LOGS = [
  {
    id: 801,
    admin_id: 999,
    admin_email: 'faculty.admin@example.com',
    action: 'admin_login',
    target_type: 'system',
    target_id: 'session',
    details_json: JSON.stringify({ ip: '192.168.1.15', method: 'institutional_oauth' }),
    ip_address: '192.168.1.15',
    timestamp: '2026-10-16T08:30:00Z',
  },
  {
    id: 802,
    admin_id: 999,
    admin_email: 'faculty.admin@example.com',
    action: 'quota_updated',
    target_type: 'user',
    target_id: '105',
    details_json: JSON.stringify({ student_name: 'Karthik Nair', student_email: 'karthik.nair@example.com', old_quota_bytes: 52428800, new_quota_bytes: 104857600, new_quota_human: '100.0 MB' }),
    ip_address: '192.168.1.15',
    timestamp: '2026-10-15T11:45:00Z',
  },
  {
    id: 803,
    admin_id: 999,
    admin_email: 'faculty.admin@example.com',
    action: 'alert_broadcast',
    target_type: 'notification',
    target_id: 'all',
    details_json: JSON.stringify({ title: 'Midterm Practice Quizzes Available Across All Engineering Departments', target_scope: 'all', recipients_count: 14 }),
    ip_address: '192.168.1.15',
    timestamp: '2026-10-14T14:00:00Z',
  },
  {
    id: 804,
    admin_id: 999,
    admin_email: 'faculty.admin@example.com',
    action: 'feedback_reply',
    target_type: 'feedback',
    target_id: '502',
    details_json: JSON.stringify({ ticket_id: 502, student_email: 'rohan.verma@example.com', action: 'faculty_reply_sent' }),
    ip_address: '192.168.1.15',
    timestamp: '2026-10-14T15:20:00Z',
  },
  {
    id: 805,
    admin_id: 999,
    admin_email: 'faculty.admin@example.com',
    action: 'cleanup_dry_run',
    target_type: 'storage',
    target_id: '104',
    details_json: JSON.stringify({ student_name: 'Ananya Iyer', simulated_files_deleted: 1, simulated_bytes_reclaimed: 13631488, remaining_usage_bytes: 51485081 }),
    ip_address: '192.168.1.15',
    timestamp: '2026-10-15T16:00:00Z',
  },
  {
    id: 806,
    admin_id: 999,
    admin_email: 'faculty.admin@example.com',
    action: 'user_status_updated',
    target_type: 'user',
    target_id: '108',
    details_json: JSON.stringify({ student_name: 'Divya Sundaram', old_status: 'active', new_status: 'suspended', reason: 'Honor code inquiry under review' }),
    ip_address: '192.168.1.15',
    timestamp: '2026-10-02T10:00:00Z',
  },
];

const INITIAL_DEMO_CLEANUP_LOGS = [
  {
    id: 901,
    student_id: 114,
    student_name: 'Sanya Mirza',
    student_email: 'sanya.mirza@example.com',
    trigger_type: 'dry_run',
    is_dry_run: true,
    status: 'success',
    files_deleted_count: 1,
    bytes_reclaimed: 25165824,
    deleted_files_json: JSON.stringify([{ filename: 'CMOS_Inverter_Propagation_Delay_Layout.pdf', size_bytes: 25165824 }]),
    error_message: null,
    executed_at: '2026-10-14T10:00:00Z',
  },
  {
    id: 902,
    student_id: 104,
    student_name: 'Ananya Iyer',
    student_email: 'ananya.iyer@example.com',
    trigger_type: 'dry_run',
    is_dry_run: true,
    status: 'success',
    files_deleted_count: 1,
    bytes_reclaimed: 13631488,
    deleted_files_json: JSON.stringify([{ filename: 'SQL_Subqueries_Practice_Exercises.pdf', size_bytes: 13631488 }]),
    error_message: null,
    executed_at: '2026-10-15T16:00:00Z',
  },
  {
    id: 903,
    student_id: 105,
    student_name: 'Past Term Student',
    student_email: 'archived.student@example.com',
    trigger_type: 'scheduled',
    is_dry_run: false,
    status: 'success',
    files_deleted_count: 2,
    bytes_reclaimed: 23450000,
    deleted_files_json: JSON.stringify([{ filename: 'Old_Draft_Notes.pdf', size_bytes: 11450000 }, { filename: 'Temp_Lab_Report.pdf', size_bytes: 12000000 }]),
    error_message: null,
    executed_at: '2026-09-01T02:00:00Z',
  },
];

class AdminDemoStore {
  constructor() {
    this.storageKey = 'learnai_admin_demo_state_v1';
    this.state = this.loadState();
  }

  loadState() {
    try {
      const stored = sessionStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return this.getInitialState();
  }

  getInitialState() {
    return {
      students: JSON.parse(JSON.stringify(INITIAL_DEMO_STUDENTS)),
      feedbacks: JSON.parse(JSON.stringify(INITIAL_DEMO_FEEDBACKS)),
      alerts: JSON.parse(JSON.stringify(INITIAL_DEMO_ALERTS)),
      auditLogs: JSON.parse(JSON.stringify(INITIAL_DEMO_AUDIT_LOGS)),
      cleanupLogs: JSON.parse(JSON.stringify(INITIAL_DEMO_CLEANUP_LOGS)),
      settings: {
        default_quota_mb: 50,
        warning_threshold_pct: 80,
        retention_days: 30,
        dry_run_default: true,
        max_upload_mb: 25,
      },
    };
  }

  saveState() {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
      // Ignore
    }
  }

  reset() {
    this.state = this.getInitialState();
    this.saveState();
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // ----------------- Dashboard & Metrics -----------------

  async getDashboardStats() {
    const students = this.state.students;
    const totalRegistered = students.length;
    const active7d = students.filter((s) => s.status === 'active').length;

    let totalStorageBytes = 0;
    let usersOverQuota = 0;
    let usersInWarning = 0;

    for (const s of students) {
      const used = s.storage_used_bytes || 0;
      const quota = s.custom_quota_bytes || (50 * 1024 * 1024);
      totalStorageBytes += used;
      const pct = (used / quota) * 100;
      if (pct >= 100) usersOverQuota += 1;
      else if (pct >= 80) usersInWarning += 1;
    }

    const openFeedback = this.state.feedbacks.filter((f) => f.status === 'open' || f.status === 'awaiting_student').length;
    const awaitingAdmin = this.state.feedbacks.filter((f) => f.status === 'open').length;

    const recentEvents = this.state.auditLogs.slice(0, 5).map((l) => ({
      id: l.id,
      action: l.action,
      admin_email: l.admin_email,
      target_type: l.target_type,
      target_id: l.target_id,
      timestamp: l.timestamp,
    }));

    return {
      users: {
        total_registered: totalRegistered,
        active_last_7d: active7d,
        active_last_30d: totalRegistered,
      },
      storage: {
        total_user_storage_bytes: totalStorageBytes,
        total_user_storage_formatted: this.formatBytes(totalStorageBytes),
        total_system_storage_bytes: totalStorageBytes + 142000000,
        total_system_storage_formatted: this.formatBytes(totalStorageBytes + 142000000),
        users_in_warning: usersInWarning,
        users_over_quota: usersOverQuota,
      },
      retention: {
        active_warnings_count: usersOverQuota,
        pending_cleanups_count: students.filter((s) => s.days_elapsed >= 30).length,
        cleanups_executed_last_30d: 1,
      },
      feedback: {
        total_feedback: this.state.feedbacks.length,
        open_feedback: openFeedback,
        awaiting_admin: awaitingAdmin,
        average_rating: 4.4,
      },
      recent_events: recentEvents,
    };
  }

  // ----------------- Users Management -----------------

  async getUsers(params = {}) {
    let items = [...this.state.students];

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.department && s.department.toLowerCase().includes(q))
      );
    }

    if (params.warning_filter && params.warning_filter !== 'all') {
      items = items.filter((s) => s.warning_status === params.warning_filter);
    }

    const total = items.length;
    const page = params.page ? parseInt(params.page, 10) : 1;
    const pageSize = params.page_size ? parseInt(params.page_size, 10) : 15;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return {
      total,
      page,
      page_size: pageSize,
      items: paged,
      users: paged,
    };
  }

  async getUserDetail(userId) {
    const numId = parseInt(userId, 10);
    const student = this.state.students.find((s) => s.id === numId);
    if (!student) {
      throw new Error(`Demo student with ID ${userId} not found.`);
    }

    const used = student.storage_used_bytes || 0;
    const quota = student.custom_quota_bytes || (50 * 1024 * 1024);

    return {
      ...student,
      storage: {
        used_bytes: used,
        quota_bytes: quota,
        used_percentage: Math.min(100, Math.round((used / quota) * 100)),
        warning_status: student.warning_status,
        cleanup_deadline: student.cleanup_deadline,
        days_left: student.cleanup_deadline ? Math.max(0, 30 - (student.days_elapsed || 0)) : null,
        files: student.documents || [],
      },
      storage_warnings: student.warning_status === 'over_quota'
        ? [
            {
              id: 991,
              student_id: student.id,
              student_name: student.name,
              student_email: student.email,
              start_time: '2026-10-04T00:00:00Z',
              deadline: student.cleanup_deadline || '2026-11-03T00:00:00Z',
              status: 'active',
              reason: 'Storage quota exceeded (50 MB limit)',
              current_usage_bytes: used,
              quota_bytes: quota,
              days_elapsed: student.days_elapsed || 12,
              warning_date: '2026-10-04T00:00:00Z',
            },
          ]
        : [],
    };
  }

  async getUserStorage(userId) {
    const detail = await this.getUserDetail(userId);
    return detail.storage;
  }

  async updateUserQuota(userId, quotaMb) {
    const numId = parseInt(userId, 10);
    const student = this.state.students.find((s) => s.id === numId);
    if (!student) throw new Error('Demo student not found.');

    const newBytes = parseInt(quotaMb, 10) * 1024 * 1024;
    const oldQuota = student.custom_quota_bytes || 52428800;
    student.custom_quota_bytes = newBytes;
    student.quota_bytes = newBytes;

    // Re-evaluate warning status
    const pct = (student.storage_used_bytes / newBytes) * 100;
    if (pct >= 100) {
      student.warning_status = 'over_quota';
    } else if (pct >= 80) {
      student.warning_status = 'approaching_quota';
      student.cleanup_deadline = null;
    } else {
      student.warning_status = 'normal';
      student.cleanup_deadline = null;
    }

    // Add audit entry
    this.addAuditLog({
      action: 'quota_updated',
      target_type: 'user',
      target_id: String(student.id),
      details: {
        student_name: student.name,
        student_email: student.email,
        old_quota_bytes: oldQuota,
        new_quota_bytes: newBytes,
        new_quota_human: `${quotaMb}.0 MB`,
        is_demo: true,
      },
    });

    // Add student notification
    student.recent_notifications.unshift({
      id: Date.now(),
      user_id: student.id,
      type: 'account_notice',
      title: 'Storage Quota Updated (Demo)',
      message: `Your LearnAI storage quota has been adjusted to ${quotaMb} MB.`,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    this.saveState();
    return {
      message: `Storage quota successfully updated to ${quotaMb} MB (Demo Simulation).`,
      quota_bytes: newBytes,
      storage: {
        used_bytes: student.storage_used_bytes,
        quota_bytes: newBytes,
        used_percentage: Math.min(100, Math.round(pct)),
      },
    };
  }

  async updateStudentStatus(userId, status, reason = '') {
    const numId = parseInt(userId, 10);
    const student = this.state.students.find((s) => s.id === numId);
    if (!student) throw new Error('Demo student not found.');

    const oldStatus = student.status;
    student.status = status;

    this.addAuditLog({
      action: 'user_status_updated',
      target_type: 'user',
      target_id: String(student.id),
      details: {
        student_name: student.name,
        old_status: oldStatus,
        new_status: status,
        reason: reason || 'Administrative action (Demo)',
        is_demo: true,
      },
    });

    this.saveState();
    return {
      message: `Demo student account status updated to '${status}'.`,
      status,
    };
  }

  async deleteStudentAccount(userId) {
    const numId = parseInt(userId, 10);
    const idx = this.state.students.findIndex((s) => s.id === numId);
    if (idx === -1) throw new Error('Demo student not found.');

    const removed = this.state.students[idx];
    this.state.students.splice(idx, 1);

    this.addAuditLog({
      action: 'student_account_deleted',
      target_type: 'user',
      target_id: String(numId),
      details: {
        deleted_student_name: removed.name,
        deleted_student_email: removed.email,
        is_demo: true,
      },
    });

    this.saveState();
    return {
      status: 'success',
      message: `Demo student account '${removed.email}' has been removed from demo session.`,
      deleted_student_id: numId,
    };
  }

  // ----------------- Storage & Retention -----------------

  async getStorageWarnings(statusFilter = 'active') {
    const warnings = [];
    for (const s of this.state.students) {
      if (s.warning_status === 'over_quota') {
        warnings.push({
          id: s.id + 1000,
          student_id: s.id,
          student_name: s.name,
          student_email: s.email,
          storage_used_bytes: s.storage_used_bytes,
          quota_bytes: s.custom_quota_bytes || 52428800,
          days_elapsed: s.days_elapsed || 14,
          deadline: s.cleanup_deadline || '2026-11-03T00:00:00Z',
          warning_date: '2026-10-02T10:00:00Z',
          status: 'active',
          reason: 'Storage quota exceeded (Demo)',
        });
      }
    }
    return warnings;
  }

  async previewCleanup(studentId, graceDays = 30) {
    const numId = parseInt(studentId, 10);
    const student = this.state.students.find((s) => s.id === numId);
    if (!student) throw new Error('Demo student not found.');

    const files = student.documents || [];
    const quota = student.custom_quota_bytes || 52428800;
    let reclaimed = 0;
    const candidates = [];

    for (const f of files) {
      if ((student.storage_used_bytes - reclaimed) > quota) {
        reclaimed += f.file_size;
        candidates.push({
          document_id: f.id,
          filename: f.filename,
          size_bytes: f.file_size,
          upload_date: f.upload_date,
        });
      }
    }

    return {
      status: 'success',
      is_dry_run: true,
      student_id: numId,
      files_evaluated: files.length,
      files_deleted_count: candidates.length,
      bytes_reclaimed: reclaimed,
      remaining_usage_bytes: Math.max(0, student.storage_used_bytes - reclaimed),
      quota_bytes: quota,
      deleted_files: candidates,
      candidate_files: candidates,
      files_candidate_count: candidates.length,
      bytes_reclaimable: reclaimed,
      message: `[DEMO DRY RUN] Would delete ${candidates.length} file(s), reclaiming ${this.formatBytes(reclaimed)}.`,
    };
  }

  async executeCleanup(studentId, graceDays = 30) {
    const numId = parseInt(studentId, 10);
    const student = this.state.students.find((s) => s.id === numId);
    if (!student) throw new Error('Demo student not found.');

    const preview = await this.previewCleanup(studentId, graceDays);
    const deletedFiles = preview.deleted_files || [];
    const reclaimed = preview.bytes_reclaimed || 0;

    // Simulate removing those files from student
    const deletedIds = new Set(deletedFiles.map((d) => d.document_id));
    student.documents = (student.documents || []).filter((d) => !deletedIds.has(d.id));
    student.storage_used_bytes = Math.max(0, student.storage_used_bytes - reclaimed);

    // Resolve warning status
    student.warning_status = 'normal';
    student.cleanup_deadline = null;

    // Record cleanup log
    const logEntry = {
      id: Date.now(),
      student_id: numId,
      student_name: student.name,
      student_email: student.email,
      trigger_type: 'manual_admin',
      is_dry_run: false,
      status: 'success',
      files_deleted_count: deletedFiles.length,
      bytes_reclaimed: reclaimed,
      deleted_files_json: JSON.stringify(deletedFiles),
      error_message: null,
      executed_at: new Date().toISOString(),
    };
    this.state.cleanupLogs.unshift(logEntry);

    // Record audit log
    this.addAuditLog({
      action: 'cleanup_executed',
      target_type: 'storage',
      target_id: String(numId),
      details: {
        student_name: student.name,
        files_deleted: deletedFiles.length,
        bytes_reclaimed: reclaimed,
        is_demo: true,
      },
    });

    this.saveState();
    return {
      status: 'success',
      is_dry_run: false,
      student_id: numId,
      files_deleted_count: deletedFiles.length,
      bytes_reclaimed: reclaimed,
      remaining_usage_bytes: student.storage_used_bytes,
      quota_bytes: student.custom_quota_bytes || 52428800,
      deleted_files: deletedFiles,
      message: `[DEMO] Simulated cleanup completed: ${deletedFiles.length} files removed, reclaiming ${this.formatBytes(reclaimed)}.`,
    };
  }

  async getCleanupLogs() {
    return [...this.state.cleanupLogs];
  }

  // ----------------- Alerts & Announcements -----------------

  async broadcastAlert(data) {
    const newAlert = {
      id: Date.now(),
      title: data.title,
      message: data.message,
      category: data.category || 'announcement',
      type: data.category || 'announcement',
      scope: data.scope || data.target_scope || 'all',
      is_read: false,
      created_at: new Date().toISOString(),
    };

    this.state.alerts.unshift(newAlert);

    // If targeted, add to target demo students
    const targetIds = data.student_ids || data.target_user_ids || [];
    let recipientCount = 0;

    for (const st of this.state.students) {
      const match =
        newAlert.scope === 'all' ||
        targetIds.includes(st.id);
      if (match) {
        st.recent_notifications.unshift({
          id: Date.now() + Math.random(),
          user_id: st.id,
          title: data.title,
          message: data.message,
          type: data.category || 'announcement',
          is_read: false,
          created_at: new Date().toISOString(),
        });
        recipientCount += 1;
      }
    }

    this.addAuditLog({
      action: 'alert_broadcast',
      target_type: 'notification',
      target_id: newAlert.scope,
      details: {
        title: data.title,
        category: data.category,
        recipients_count: recipientCount,
        is_demo: true,
      },
    });

    this.saveState();
    return {
      message: `[DEMO] Successfully sent simulated notification to ${recipientCount} recipient(s).`,
      recipients_count: recipientCount,
    };
  }

  async getAlertsHistory(limit = 30) {
    return this.state.alerts.slice(0, limit);
  }

  // ----------------- Feedback & Support -----------------

  async getFeedback(statusFilter = null) {
    let list = [...this.state.feedbacks];
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((f) => f.status === statusFilter);
    }
    return list;
  }

  async getFeedbackThread(id) {
    const numId = parseInt(id, 10);
    const fb = this.state.feedbacks.find((f) => f.id === numId);
    if (!fb) throw new Error('Demo feedback thread not found.');
    return JSON.parse(JSON.stringify(fb));
  }

  async replyToFeedback(id, message) {
    const numId = parseInt(id, 10);
    const fb = this.state.feedbacks.find((f) => f.id === numId);
    if (!fb) throw new Error('Demo feedback thread not found.');

    const newReply = {
      id: Date.now(),
      feedback_id: numId,
      sender_id: 999,
      sender_role: 'admin',
      sender_name: 'Faculty Administrator (Demo)',
      message,
      created_at: new Date().toISOString(),
    };

    fb.replies.push(newReply);
    fb.status = 'awaiting_student';
    fb.updated_at = new Date().toISOString();

    this.addAuditLog({
      action: 'feedback_reply',
      target_type: 'feedback',
      target_id: String(numId),
      details: {
        ticket_id: numId,
        student_email: fb.student_email,
        action: 'faculty_reply_sent',
        is_demo: true,
      },
    });

    this.saveState();
    return newReply;
  }

  async updateFeedbackStatus(id, newStatus) {
    const numId = parseInt(id, 10);
    const fb = this.state.feedbacks.find((f) => f.id === numId);
    if (!fb) throw new Error('Demo feedback thread not found.');

    const oldStatus = fb.status;
    fb.status = newStatus;
    fb.updated_at = new Date().toISOString();

    this.addAuditLog({
      action: 'feedback_status_changed',
      target_type: 'feedback',
      target_id: String(numId),
      details: {
        ticket_id: numId,
        old_status: oldStatus,
        new_status: newStatus,
        is_demo: true,
      },
    });

    this.saveState();
    return { status: newStatus };
  }

  // ----------------- Audit Logs -----------------

  async getAuditLogs(params = {}) {
    let logs = [...this.state.auditLogs];

    if (params.action) {
      logs = logs.filter((l) => l.action.includes(params.action));
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.admin_email.toLowerCase().includes(q) ||
          l.details_json.toLowerCase().includes(q)
      );
    }

    const total = logs.length;
    const page = params.page ? parseInt(params.page, 10) : 1;
    const pageSize = params.page_size ? parseInt(params.page_size, 10) : 20;
    const start = (page - 1) * pageSize;
    const paged = logs.slice(start, start + pageSize);

    return {
      total,
      page,
      page_size: pageSize,
      logs: paged,
      items: paged,
    };
  }

  addAuditLog({ action, target_type, target_id, details }) {
    const entry = {
      id: Date.now() + Math.floor(Math.random() * 100),
      admin_id: 999,
      admin_email: 'faculty.admin@example.com',
      action,
      target_type,
      target_id: String(target_id),
      details_json: JSON.stringify(details),
      ip_address: '192.168.1.15 [DEMO]',
      timestamp: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(entry);
  }

  // ----------------- System Health -----------------

  async getSystemHealth() {
    return {
      overall_status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.4.0-demo',
      backend_uptime: 'Online & Operational [DEMO MODE]',
      mode: 'DEMO',
      is_simulated: true,
      database: {
        status: 'connected',
        connected: true,
        database_url_safe: 'sqlite:///learnai_demo_memory.db',
        database_size_bytes: 3145728,
        database_size_formatted: '3.0 MB',
        total_students: this.state.students.length,
        total_documents: 28,
        total_quizzes: 84,
        total_audit_events: this.state.auditLogs.length,
      },
      storage: {
        status: 'healthy',
        upload_dir: 'uploads/demo_fixtures',
        total_uploads_bytes: 454360000,
        total_uploads_formatted: '433.3 MB',
        file_count: 28,
        disk_total_bytes: 512000000000,
        disk_total_formatted: '476.8 GB',
        disk_free_bytes: 153000000000,
        disk_free_formatted: '142.5 GB',
        disk_used_percent: 70.1,
      },
      ai_service: {
        status: 'operational',
        configured: true,
        provider: 'Google Gemini Flash API (Academic Grounding)',
        model: 'gemini-1.5-flash-grounded',
        notes: 'AI Tutor & RAG retrieval operational for curriculum queries',
      },
      retention_cleaner: {
        status: 'active',
        active_warnings_count: this.state.students.filter((s) => s.warning_status === 'over_quota').length,
        pending_cleanup_count: this.state.students.filter((s) => (s.days_elapsed || 0) >= 30).length,
        last_cleanup_timestamp: this.state.cleanupLogs[0]?.executed_at || null,
        dry_run_enabled: this.state.settings.dry_run_default,
      },
      audit_integrity: {
        status: 'active',
        total_events_logged: this.state.auditLogs.length,
        recent_error_events_count: 0,
      },
    };
  }

  // ----------------- Settings -----------------

  async getSettings() {
    return { ...this.state.settings };
  }

  async updateSettings(data) {
    this.state.settings = {
      ...this.state.settings,
      ...data,
    };
    this.addAuditLog({
      action: 'settings_updated',
      target_type: 'system',
      target_id: 'platform_settings',
      details: { ...data, is_demo: true },
    });
    this.saveState();
    return { ...this.state.settings };
  }
}

export const adminDemoStore = new AdminDemoStore();
