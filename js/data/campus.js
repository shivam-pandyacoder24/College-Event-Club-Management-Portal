'use strict';

/**
 * SAMPLE DATA
 * A made-up campus: 12 clubs, 32 events and 60 students.
 *
 * Nothing here is real. The events are dated as "days from today", so the site
 * always opens with a full calendar of upcoming events.
 */

/** Categories as [id, name, parent id]. A parent is always listed before its children. */
const SAMPLE_CATEGORIES = [
  ['technical', 'Technical', 'all'],
  ['workshops', 'Workshops', 'technical'],
  ['hackathons', 'Hackathons', 'technical'],
  ['talks', 'Talks and seminars', 'technical'],
  ['competitions', 'Competitions', 'technical'],

  ['cultural', 'Cultural', 'all'],
  ['music', 'Music', 'cultural'],
  ['dance', 'Dance', 'cultural'],
  ['drama', 'Drama', 'cultural'],
  ['art', 'Art and photography', 'cultural'],

  ['sports', 'Sports', 'all'],
  ['tournaments', 'Tournaments', 'sports'],
  ['fitness', 'Fitness', 'sports'],

  ['literary', 'Literary', 'all'],
  ['debates', 'Debates', 'literary'],
  ['quizzes', 'Quizzes', 'literary'],
  ['writing', 'Writing', 'literary'],

  ['social', 'Social', 'all'],
  ['volunteering', 'Volunteering', 'social'],
  ['awareness', 'Awareness', 'social'],
];

/** `members` is how many students the club starts with in the sample data. */
const SAMPLE_CLUBS = [
  {
    id: 'ai',
    name: 'AI Club',
    focus: 'technical',
    tagline: 'Machine learning, from a first model to a research paper.',
    meets: 'Wednesdays at 5:00 pm, Tech Park, Lab 404',
    members: 16,
  },
  {
    id: 'coding',
    name: 'Coding Club',
    focus: 'technical',
    tagline: 'Competitive programming and weekend builds.',
    meets: 'Tuesdays at 5:30 pm, Computer Centre',
    members: 18,
  },
  {
    id: 'robotics',
    name: 'Robotics Club',
    focus: 'technical',
    tagline: 'Line followers, drones and a lot of soldering.',
    meets: 'Fridays at 4:30 pm, Robotics Lab',
    members: 11,
  },
  {
    id: 'ecell',
    name: 'Entrepreneurship Cell',
    focus: 'technical',
    tagline: 'Student startups, pitches and people who have built one.',
    meets: 'Thursdays at 5:00 pm, Seminar Hall 2',
    members: 9,
  },
  {
    id: 'music',
    name: 'Music Club',
    focus: 'cultural',
    tagline: 'Bands, classical ensembles and open mics.',
    meets: 'Mondays at 6:00 pm, Music Room',
    members: 12,
  },
  {
    id: 'dance',
    name: 'Dance Club',
    focus: 'cultural',
    tagline: 'Classical, folk and street styles under one roof.',
    meets: 'Tuesdays and Thursdays at 6:00 pm, Dance Studio',
    members: 10,
  },
  {
    id: 'drama',
    name: 'Drama Club',
    focus: 'cultural',
    tagline: 'Stage plays, street plays and improv.',
    meets: 'Wednesdays at 6:00 pm, Mini Auditorium',
    members: 9,
  },
  {
    id: 'photo',
    name: 'Photography Club',
    focus: 'cultural',
    tagline: 'Photo walks, editing sessions and a yearly exhibition.',
    meets: 'Saturdays at 7:00 am, Main Gate',
    members: 11,
  },
  {
    id: 'literary',
    name: 'Literary Society',
    focus: 'literary',
    tagline: 'Debates, poetry and the campus magazine.',
    meets: 'Mondays at 5:00 pm, Library, Room 3',
    members: 8,
  },
  {
    id: 'quiz',
    name: 'Quiz Club',
    focus: 'literary',
    tagline: 'General, science and sports quizzes, most weeks.',
    meets: 'Fridays at 5:00 pm, Seminar Hall 1',
    members: 10,
  },
  {
    id: 'sports',
    name: 'Sports Council',
    focus: 'sports',
    tagline: 'Inter-department leagues and early-morning fitness.',
    meets: 'Saturdays at 6:30 am, Indoor Stadium',
    members: 14,
  },
  {
    id: 'social',
    name: 'Social Service Club',
    focus: 'social',
    tagline: 'Volunteering on campus and in the neighbourhood.',
    meets: 'Sundays at 8:00 am, Central Lawn',
    members: 12,
  },
];

/**
 * `day` counts days from today and `time` is on a 24-hour clock.
 * `going` and `waiting` are how many students have a seat, and how many are on
 * the waiting list, when the sample data is first loaded.
 */
const SAMPLE_EVENTS = [
  {
    id: 512,
    name: 'AI Workshop',
    club: 'ai',
    category: 'workshops',
    day: 4,
    time: '14:00',
    venue: 'Tech Park, Lab 404',
    seats: 12,
    about: 'Train an image classifier from scratch in one afternoon. No experience needed. Bring a laptop.',
    tags: ['machine learning', 'python', 'beginners'],
    going: 12,
    waiting: 4,
  },
  {
    id: 731,
    name: 'ML Seminar',
    club: 'ai',
    category: 'talks',
    day: 18,
    time: '16:00',
    venue: 'Main Auditorium',
    seats: 40,
    about: 'A research scholar explains how recommendation models are tested before they reach real users.',
    tags: ['machine learning', 'research', 'talk'],
    going: 21,
    waiting: 0,
  },
  {
    id: 407,
    name: 'Hackathon',
    club: 'coding',
    category: 'hackathons',
    day: 14,
    time: '09:00',
    venue: 'Innovation Centre',
    seats: 16,
    about: 'Twenty-four hours, teams of four, and one problem statement that is revealed at the start.',
    tags: ['coding', 'teams', 'overnight'],
    going: 14,
    waiting: 0,
  },
  {
    id: 153,
    name: 'Code Sprint',
    club: 'coding',
    category: 'competitions',
    day: 6,
    time: '18:00',
    venue: 'Computer Centre',
    seats: 20,
    about: 'Three hours, six problems and a live leaderboard. Any language is allowed.',
    tags: ['competitive programming', 'contest'],
    going: 11,
    waiting: 0,
  },
  {
    id: 884,
    name: 'Git and GitHub Basics',
    club: 'coding',
    category: 'workshops',
    day: 2,
    time: '17:00',
    venue: 'Tech Park, Lab 210',
    seats: 15,
    about: 'Commits, branches and pull requests, practised on a shared repository.',
    tags: ['version control', 'beginners'],
    going: 15,
    waiting: 2,
  },
  {
    id: 975,
    name: 'Arduino Starter Night',
    club: 'robotics',
    category: 'workshops',
    day: 1,
    time: '18:00',
    venue: 'Robotics Lab',
    seats: 14,
    about: 'Blink an LED, read a sensor and drive a motor. Kits are provided.',
    tags: ['electronics', 'beginners'],
    going: 9,
    waiting: 0,
  },
  {
    id: 629,
    name: 'Drone Building Workshop',
    club: 'robotics',
    category: 'workshops',
    day: 9,
    time: '10:00',
    venue: 'Robotics Lab',
    seats: 10,
    about: 'Assemble and tune a quadcopter in teams of two, then fly it on the lawn.',
    tags: ['electronics', 'quadcopter'],
    going: 10,
    waiting: 4,
  },
  {
    id: 346,
    name: 'Line Follower Challenge',
    club: 'robotics',
    category: 'competitions',
    day: 18,
    time: '10:00',
    venue: 'Mechanical Workshop',
    seats: 12,
    about: 'The fastest robot around the track wins. Bring your own or borrow a club kit.',
    tags: ['robots', 'race'],
    going: 7,
    waiting: 0,
  },
  {
    id: 558,
    name: 'Founder Talk: The First 100 Users',
    club: 'ecell',
    category: 'talks',
    day: 8,
    time: '16:00',
    venue: 'Seminar Hall 1',
    seats: 35,
    about: 'A graduate who started a company in the hostel describes what worked in year one and what did not.',
    tags: ['startup', 'talk'],
    going: 19,
    waiting: 0,
  },
  {
    id: 190,
    name: 'Startup Pitch Night',
    club: 'ecell',
    category: 'competitions',
    day: 21,
    time: '17:30',
    venue: 'Seminar Hall 2',
    seats: 18,
    about: 'Five minutes to pitch an idea, three minutes of questions from the judges.',
    tags: ['startup', 'pitch'],
    going: 10,
    waiting: 0,
  },
  {
    id: 437,
    name: 'Open Mic Night',
    club: 'music',
    category: 'music',
    day: 5,
    time: '18:30',
    venue: 'Amphitheatre',
    seats: 30,
    about: 'Sing, play, or read something. Sign up for a five-minute slot or come to listen.',
    tags: ['singing', 'performance'],
    going: 24,
    waiting: 0,
  },
  {
    id: 812,
    name: 'Battle of Bands',
    club: 'music',
    category: 'music',
    day: 28,
    time: '17:00',
    venue: 'Open Air Theatre',
    seats: 40,
    about: 'Six campus bands, twenty minutes each, and an audience vote for the winner.',
    tags: ['bands', 'performance'],
    going: 17,
    waiting: 0,
  },
  {
    id: 295,
    name: 'Folk Dance Workshop',
    club: 'dance',
    category: 'dance',
    day: 7,
    time: '16:30',
    venue: 'Dance Studio',
    seats: 12,
    about: 'Learn a garba and a bhangra routine in two hours. Beginners are welcome.',
    tags: ['garba', 'bhangra', 'beginners'],
    going: 12,
    waiting: 1,
  },
  {
    id: 663,
    name: 'Dance Showdown',
    club: 'dance',
    category: 'dance',
    day: 30,
    time: '18:00',
    venue: 'Open Air Theatre',
    seats: 24,
    about: 'Solo and crew rounds in any style, judged by the Dance Club seniors.',
    tags: ['competition', 'performance'],
    going: 9,
    waiting: 0,
  },
  {
    id: 121,
    name: 'Improv Jam',
    club: 'drama',
    category: 'drama',
    day: 3,
    time: '17:30',
    venue: 'Mini Auditorium',
    seats: 16,
    about: 'Short improv games with no script and no preparation.',
    tags: ['theatre', 'beginners'],
    going: 13,
    waiting: 0,
  },
  {
    id: 790,
    name: 'Street Play Festival',
    club: 'drama',
    category: 'drama',
    day: 19,
    time: '16:00',
    venue: 'Central Lawn',
    seats: 30,
    about: 'Four teams perform street plays on themes drawn the day before.',
    tags: ['theatre', 'nukkad natak'],
    going: 12,
    waiting: 0,
  },
  {
    id: 384,
    name: 'Campus Photo Walk',
    club: 'photo',
    category: 'art',
    day: 2,
    time: '06:30',
    venue: 'Main Gate',
    seats: 15,
    about: 'A sunrise walk around campus. A phone camera is fine.',
    tags: ['photography', 'outdoor'],
    going: 12,
    waiting: 0,
  },
  {
    id: 502,
    name: 'Photo Editing Basics',
    club: 'photo',
    category: 'art',
    day: 10,
    time: '15:00',
    venue: 'Media Lab',
    seats: 12,
    about: 'Exposure, colour and cropping, using the photos you took on the walk.',
    tags: ['photography', 'editing'],
    going: 8,
    waiting: 0,
  },
  {
    id: 946,
    name: 'Photo Exhibition',
    club: 'photo',
    category: 'art',
    day: 23,
    time: '10:00',
    venue: 'Library Foyer',
    seats: 40,
    about: 'Forty prints chosen from this semester, with the photographers there to talk about them.',
    tags: ['photography', 'gallery'],
    going: 15,
    waiting: 0,
  },
  {
    id: 868,
    name: 'Magazine Writing Sprint',
    club: 'literary',
    category: 'writing',
    day: 6,
    time: '15:00',
    venue: 'Library, Room 3',
    seats: 12,
    about: 'Draft a 600-word piece for the campus magazine in one sitting, with editors on hand.',
    tags: ['writing', 'magazine'],
    going: 6,
    waiting: 0,
  },
  {
    id: 231,
    name: 'Parliamentary Debate',
    club: 'literary',
    category: 'debates',
    day: 12,
    time: '14:00',
    venue: 'Seminar Hall 2',
    seats: 16,
    about: 'Teams of two, motions announced fifteen minutes before each round.',
    tags: ['debate', 'public speaking'],
    going: 10,
    waiting: 0,
  },
  {
    id: 705,
    name: 'Poetry Slam',
    club: 'literary',
    category: 'writing',
    day: 16,
    time: '18:00',
    venue: 'Amphitheatre',
    seats: 25,
    about: 'Original poems in any language, three minutes each.',
    tags: ['poetry', 'performance'],
    going: 11,
    waiting: 0,
  },
  {
    id: 173,
    name: 'General Quiz',
    club: 'quiz',
    category: 'quizzes',
    day: 9,
    time: '17:00',
    venue: 'Seminar Hall 1',
    seats: 30,
    about: 'A written round, then six teams on stage. Teams of up to three.',
    tags: ['trivia', 'teams'],
    going: 22,
    waiting: 0,
  },
  {
    id: 596,
    name: 'Science and Tech Quiz',
    club: 'quiz',
    category: 'quizzes',
    day: 20,
    time: '17:00',
    venue: 'Seminar Hall 1',
    seats: 30,
    about: 'From the periodic table to processors. Teams of two.',
    tags: ['trivia', 'science'],
    going: 13,
    waiting: 0,
  },
  {
    id: 428,
    name: 'Sunrise Yoga',
    club: 'sports',
    category: 'fitness',
    day: 1,
    time: '06:00',
    venue: 'Central Lawn',
    seats: 25,
    about: 'A one-hour session for all levels. Mats are provided.',
    tags: ['yoga', 'wellness'],
    going: 14,
    waiting: 0,
  },
  {
    id: 319,
    name: 'Five-a-side Football League',
    club: 'sports',
    category: 'tournaments',
    day: 13,
    time: '07:00',
    venue: 'Football Ground',
    seats: 20,
    about: 'Department teams play a round robin over one weekend.',
    tags: ['football', 'league'],
    going: 20,
    waiting: 3,
  },
  {
    id: 654,
    name: 'Badminton Doubles Open',
    club: 'sports',
    category: 'tournaments',
    day: 17,
    time: '16:00',
    venue: 'Indoor Stadium',
    seats: 16,
    about: 'Knockout doubles. Register alone and you will be paired up.',
    tags: ['badminton', 'doubles'],
    going: 12,
    waiting: 0,
  },
  {
    id: 917,
    name: 'Campus 5K Run',
    club: 'sports',
    category: 'fitness',
    day: 22,
    time: '06:00',
    venue: 'Main Gate',
    seats: 40,
    about: 'Two laps of the campus loop, timed, with breakfast at the finish.',
    tags: ['running', 'fitness'],
    going: 26,
    waiting: 0,
  },
  {
    id: 589,
    name: 'Road Safety Walk',
    club: 'social',
    category: 'awareness',
    day: 5,
    time: '07:30',
    venue: 'Main Gate',
    seats: 30,
    about: 'A walk through the neighbourhood with placards, ending with a helmet check for two-wheelers.',
    tags: ['awareness', 'community'],
    going: 8,
    waiting: 0,
  },
  {
    id: 771,
    name: 'Lake Clean-up Drive',
    club: 'social',
    category: 'volunteering',
    day: 8,
    time: '06:00',
    venue: 'Bus Bay 2',
    seats: 25,
    about: 'Three hours clearing the lake shore. Gloves and bags are provided, and the bus leaves at six.',
    tags: ['environment', 'community'],
    going: 14,
    waiting: 0,
  },
  {
    id: 245,
    name: 'Blood Donation Camp',
    club: 'social',
    category: 'volunteering',
    day: 15,
    time: '09:00',
    venue: 'Health Centre',
    seats: 30,
    about: 'Run with the city blood bank. Donors and volunteers both register here.',
    tags: ['health', 'community'],
    going: 16,
    waiting: 0,
  },
  {
    id: 136,
    name: 'Weekend School',
    club: 'social',
    category: 'volunteering',
    day: 27,
    time: '10:00',
    venue: 'Community Hall',
    seats: 10,
    about: 'Teach maths or English for two hours to children from nearby schools.',
    tags: ['teaching', 'community'],
    going: 7,
    waiting: 0,
  },
];

/**
 * "Leads to" pairs: [earlier event, the event it prepares you for].
 * These become edges in the graph, and a club's trail follows them.
 */
const SAMPLE_EVENT_LINKS = [
  [512, 407], // AI Workshop -> Hackathon
  [407, 731], // Hackathon -> ML Seminar
  [884, 153], // Git and GitHub Basics -> Code Sprint
  [153, 407], // Code Sprint -> Hackathon
  [975, 629], // Arduino Starter Night -> Drone Building Workshop
  [629, 346], // Drone Building Workshop -> Line Follower Challenge
  [558, 190], // Founder Talk -> Startup Pitch Night
  [437, 812], // Open Mic Night -> Battle of Bands
  [295, 663], // Folk Dance Workshop -> Dance Showdown
  [121, 790], // Improv Jam -> Street Play Festival
  [121, 437], // Improv Jam -> Open Mic Night
  [384, 502], // Campus Photo Walk -> Photo Editing Basics
  [502, 946], // Photo Editing Basics -> Photo Exhibition
  [868, 705], // Magazine Writing Sprint -> Poetry Slam
  [173, 596], // General Quiz -> Science and Tech Quiz
  [428, 917], // Sunrise Yoga -> Campus 5K Run
  [771, 136], // Lake Clean-up Drive -> Weekend School
];

const DEPARTMENTS = {
  AI: 'Artificial Intelligence',
  CS: 'Computer Science',
  EC: 'Electronics',
  ME: 'Mechanical',
  IT: 'Information Technology',
  BT: 'Biotechnology',
};

/** A student ID is the department code, the year of joining and a roll number: AI25042. */
const SAMPLE_STUDENTS = [
  ['AI25042', 'Aarav Mehta'],
  ['AI25017', 'Diya Nair'],
  ['AI24063', 'Kabir Sethi'],
  ['AI24008', 'Ananya Rao'],
  ['AI23051', 'Vihaan Gupta'],
  ['AI25090', 'Ishita Banerjee'],
  ['AI23024', 'Rohan Kulkarni'],
  ['AI24036', 'Meera Iyer'],
  ['AI25071', 'Aditya Verma'],
  ['AI23012', 'Sana Ansari'],
  ['CS24014', 'Arjun Reddy'],
  ['CS25058', 'Priya Menon'],
  ['CS23031', 'Dev Malhotra'],
  ['CS24077', 'Kavya Pillai'],
  ['CS25003', 'Nikhil Joshi'],
  ['CS23066', 'Tara Fernandes'],
  ['CS24049', 'Siddharth Bose'],
  ['CS25025', 'Riya Kapadia'],
  ['CS23088', 'Yash Thakur'],
  ['CS24092', 'Neha Agarwal'],
  ['EC24031', 'Varun Krishnan'],
  ['EC25046', 'Pooja Shetty'],
  ['EC23019', 'Harsh Vyas'],
  ['EC24054', 'Sneha Patil'],
  ['EC25072', 'Imran Qureshi'],
  ['EC23005', 'Lakshmi Narayanan'],
  ['EC24083', 'Karthik Subramanian'],
  ['EC25011', 'Aisha Khan'],
  ['EC23060', 'Manav Desai'],
  ['EC24027', 'Nandini Ghosh'],
  ['ME24061', 'Rahul Chauhan'],
  ['ME25034', 'Simran Kaur'],
  ['ME23047', 'Tejas Gowda'],
  ['ME24009', 'Farah Ali'],
  ['ME25080', 'Abhinav Mishra'],
  ['ME23022', 'Divya Saxena'],
  ['ME24095', 'Gautam Bhat'],
  ['ME25016', 'Zoya Mirza'],
  ['ME23073', 'Pranav Shah'],
  ['ME24040', 'Keerthi Raj'],
  ['IT24052', 'Aman Tiwari'],
  ['IT25007', 'Shreya Dutta'],
  ['IT23038', 'Joel Thomas'],
  ['IT24069', 'Mitali Jain'],
  ['IT25021', 'Omkar Pawar'],
  ['IT23084', 'Ritika Sinha'],
  ['IT24013', 'Vikram Rana'],
  ['IT25056', 'Anjali Das'],
  ['IT23029', 'Nithin Mathew'],
  ['IT24098', 'Charu Bhatia'],
  ['BT24045', 'Sahil Arora'],
  ['BT25032', 'Mansi Trivedi'],
  ['BT23010', 'Rehan Siddiqui'],
  ['BT24076', 'Gayatri Mohan'],
  ['BT25064', 'Uday Prakash'],
  ['BT23053', 'Bhavna Solanki'],
  ['BT24002', 'Kiran George'],
  ['BT25087', 'Lavanya Suresh'],
  ['BT23041', 'Dhruv Chopra'],
  ['BT24020', 'Esha Pandey'],
].map(([id, name]) => ({ id, name }));

/**
 * The student the site is signed in as on a first visit. They start with two
 * clubs, two seats and a place on one waiting list, so every page has
 * something to show. Positions count from 1.
 */
const DEMO_STUDENT = {
  id: 'AI25042',
  clubs: [
    { club: 'ai', position: 7 },
    { club: 'photo', position: 4 },
  ],
  going: [
    { event: 512, position: 9 },
    { event: 384, position: 5 },
  ],
  waiting: [{ event: 629, position: 3 }],
};

/** A small random number generator that gives the same numbers every time for the same seed. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle on a copy. */
function shuffled(items, random) {
  const list = items.slice();
  for (let index = list.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    const held = list[index];
    list[index] = list[other];
    list[other] = held;
  }
  return list;
}

/**
 * Decides who is in which club and who has a seat at which event when the
 * site is first opened. The choices look random but come from a fixed seed, so
 * every visitor, and every test run, starts from the same campus.
 *
 * Returns { members, going, waiting }: lists of student IDs keyed by club id
 * or event number, each in the order the students joined.
 */
function createSampleState() {
  const random = seededRandom(20261003);
  const others = SAMPLE_STUDENTS.map((student) => student.id).filter((id) => id !== DEMO_STUDENT.id);

  const members = {};
  for (const club of SAMPLE_CLUBS) {
    const joinsDemo = DEMO_STUDENT.clubs.some((place) => place.club === club.id);
    members[club.id] = shuffled(others, random).slice(0, club.members - (joinsDemo ? 1 : 0));
  }

  const going = {};
  const waiting = {};
  for (const event of SAMPLE_EVENTS) {
    // About two seats in three go to members of the club that hosts the event.
    const fromClub = shuffled(members[event.club], random);
    const fromElsewhere = shuffled(others.filter((id) => !members[event.club].includes(id)), random);
    const line = [];
    while (fromClub.length > 0 || fromElsewhere.length > 0) {
      const pickMember = fromElsewhere.length === 0 || (fromClub.length > 0 && random() < 0.65);
      line.push(pickMember ? fromClub.shift() : fromElsewhere.shift());
    }

    const demoGoing = DEMO_STUDENT.going.some((place) => place.event === event.id);
    const demoWaiting = DEMO_STUDENT.waiting.some((place) => place.event === event.id);
    const seated = event.going - (demoGoing ? 1 : 0);
    const queued = event.waiting - (demoWaiting ? 1 : 0);

    going[event.id] = line.slice(0, seated);
    waiting[event.id] = line.slice(seated, seated + queued);
  }

  for (const place of DEMO_STUDENT.clubs) members[place.club].splice(place.position - 1, 0, DEMO_STUDENT.id);
  for (const place of DEMO_STUDENT.going) going[place.event].splice(place.position - 1, 0, DEMO_STUDENT.id);
  for (const place of DEMO_STUDENT.waiting) waiting[place.event].splice(place.position - 1, 0, DEMO_STUDENT.id);

  return { members, going, waiting };
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') {
  module.exports = {
    SAMPLE_CATEGORIES,
    SAMPLE_CLUBS,
    SAMPLE_EVENTS,
    SAMPLE_EVENT_LINKS,
    SAMPLE_STUDENTS,
    DEPARTMENTS,
    DEMO_STUDENT,
    createSampleState,
  };
}
