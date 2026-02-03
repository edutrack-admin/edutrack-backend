// utils/courseData.js
// Course data extracted from curriculum PDFs (CY 2022-23)

export const DEPARTMENTS = [
  { id: 'DIT', name: 'DIT - Diploma in Information Technology' },
  { id: 'DOMT', name: 'DOMT - Diploma in Office Management Technology' },
  { id: 'DOMT-LOM', name: 'DOMT-LOM - Legal Office Management' }
];

export const COURSES_BY_DEPARTMENT = {
  DIT: [
    // First Year - First Semester
    'COMP 001 - Introduction to Computing',
    'COMP 002 - Computer Programming 1',
    'GEED 004 - Mathematics in the Modern World',
    'GEED 005 - Purposive Communication',
    'ITEC 101 - Keyboarding and Documents Processing with Laboratory',
    'ITEC 102 - Basic Computer Hardware Servicing',
    'NSTP 001 - National Service Training Program 1',
    'PATHFIT 1 - Physical Activity Towards Health and Fitness 1',
    
    // First Year - Second Semester
    'COMP 003 - Computer Programming 2',
    'COMP 004 - Discrete Structures 1',
    'COMP 024 - Technopreneurship',
    'GEED 001 - Understanding the Self',
    'GEED 007 - Science, Technology and Society',
    'ITEC 103 - Hardware/Software Installation and Maintenance',
    'ITEC 104 - Basic Electronics',
    'NSTP 002 - National Service Training Program 2',
    'PATHFIT 2 - Physical Activity Towards Health and Fitness 2',
    
    // Second Year - First Semester
    'COMP 006 - Data Structures and Algorithms',
    'COMP 007 - Operating Systems',
    'COMP 008 - Data Communications and Networking',
    'COMP 023 - Social and Professional Issues in Computing',
    'INTE 201 - Programming 3 (Structured Programming)',
    'INTE 202 - Integrative Programming and Technologies 1',
    'PATHFIT 3 - Physical Activity Towards Health and Fitness 3',
    
    // Second Year - Second Semester
    'COMP 009 - Object Oriented Programming',
    'COMP 010 - Information Management',
    'COMP 012 - Network Administration',
    'COMP 013 - Human Computer Interaction',
    'COMP 014 - Quantitative Methods with Modeling and Simulation',
    'COMP 016 - Web Development',
    'COMP 030 - Business Intelligence',
    'INTE 403 - Systems Administration and Maintenance',
    'PATHFIT 4 - Physical Activity Towards Health and Fitness 4',
    
    // Second Year - Summer
    'ITEC 201 - Practicum 1 (Junior Programmer 1/2)',
    
    // Third Year - First Semester
    'COMP 015 - Fundamentals of Research',
    'COMP 017 - Multimedia',
    'COMP 018 - Database Administration',
    'COMP 019 - Applications Development and Emerging Technologies',
    'COMP 025 - Project Management',
    'COMP 027 - Mobile Application Development',
    'INTE 351 - Systems Analysis and Design',
    'ITEC 301 - Advance Programming',
    
    // Third Year - Second Semester
    'ITEC 302 - Capstone 2',
    'ITEC 303 - Practicum 2 (Computer Programming Specialist)',
    'ITEC 304 - Seminar on Issues and Trends in Information Technology'
  ],
  
  DOMT: [
    // First Year - First Semester
    'GEED 001 - Understanding the Self',
    'GEED 004 - Mathematics in the Modern World',
    'OFAD 101 - Keyboarding and Documents Processing',
    'OFAD 102 - Foundation of Shorthand',
    'OFAD 103 - Administrative Office Procedures and Records Management',
    'PATHFIT 1 - Physical Activity Towards Health and Fitness 1',
    'NSTP 001 - National Service Training Program 1',
    
    // First Year - Second Semester
    'GEED 005 - Purposive Communication',
    'GEED 008 - Ethics',
    'COMP 101 - Integrated Software Application',
    'OMTE 101 - Advanced Keyboarding and Documents Processing with Laboratory',
    'OFAD 104 - Advanced Shorthand',
    'OFAD 201 - Personal and Professional Development',
    'NSTP 002 - National Service Training Program 2',
    'PATHFIT 2 - Physical Activity Towards Health and Fitness 2'
  ],
  
  'DOMT-LOM': [
    // First Year - First Semester
    'GEED 001 - Understanding the Self',
    'GEED 004 - Mathematics in the Modern World',
    'NSTP 001 - National Service Training Program 1',
    'OFAD 101 - Keyboarding and Documents Processing',
    'OFAD 102 - Foundation of Shorthand',
    'OFAD 103 - Administrative Office Procedures and Records Management',
    'PATHFIT 1 - Physical Activity Towards Health and Fitness 1',
    
    // First Year - Second Semester
    'COMP 101 - Integrated Software Application',
    'GEED 005 - Purposive Communication',
    'GEED 008 - Ethics',
    'NSTP 002 - National Service Training Program 2',
    'OFAD 104 - Advanced Shorthand',
    'OFAD 201 - Personal and Professional Development',
    'OMTE 101 - Advanced Keyboarding and Documents Processing with Laboratory',
    'PATHFIT 2 - Physical Activity Towards Health and Fitness 2',
    
    // Second Year - First Semester
    'OMTE 102 - Accounting Principles',
    'ENGL 017 - Business Report Writing',
    'ENTR 101 - Entrepreneurial Behavior',
    'OFAD 361 - Legal Terminology with Transcription',
    'OFAD 351 - Legal Office Procedures',
    'LAW 015 - Business Law (Obligations and Contracts)',
    'OFAD 105 - Principles of Public and Customer Relations',
    'PATHFIT 3 - Physical Activity Towards Health and Fitness 3',
    
    // Second Year - Second Semester
    'ACCO 017 - Corporate Accounting',
    'OMTE 201 - Legal Transcription',
    'OFAD 205 - Internet Research for Business',
    'OFAD 203 - Transcription and Speedbuilding with Laboratory',
    'OFAD 302 - Machine Shorthand 1',
    'PATHFIT 4 - Physical Activity Towards Health and Fitness 4',
    
    // Second Year - Summer
    'OMTE 203 - Practicum 1 (Office Management)',
    
    // Third Year - First Semester
    'COMP 106 - Introduction to Database Management System',
    'OFAD 371 - Filipino Stenography',
    'OFAD 202 - Web Design for Business',
    'OFAD 301 - Events Management',
    'OFAD 451 - Machine Shorthand 2',
    
    // Third Year - Second Semester
    'OMTE 301 - Practicum 2 (Legal Office Management)',
    'OMTE 303 - Seminar on Issues and Trends in Office Management Technology'
  ]
};

// Helper function to get courses for a department
export const getCoursesByDepartment = (departmentId) => {
  return COURSES_BY_DEPARTMENT[departmentId] || [];
};

// Helper function to get department name
export const getDepartmentName = (departmentId) => {
  const dept = DEPARTMENTS.find(d => d.id === departmentId);
  return dept ? dept.name : '';
};