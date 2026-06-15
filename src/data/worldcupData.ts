import type { Team, Match, AgentState } from '../types';

export const teams: Record<string, Team> = {
  // ── GROUP A ──────────────────────────────────────────────
  MEX: {
    id: "MEX", name: "Mexico", emoji: "🇲🇽", fifaRank: 16, group: "Group A",
    stats: { attack: 84, midfield: 82, defense: 81 },
    recentForm: ['W', 'D', 'W', 'L', 'W'],
    starPlayers: ["Hirving Lozano", "Edson Álvarez", "Santiago Giménez", "Guillermo Ochoa"],
    injuries: [
      { playerName: "Hirving Lozano", severity: "low", description: "Minor knee bruise — expected to start" }
    ]
  },
  RSA: {
    id: "RSA", name: "South Africa", emoji: "🇿🇦", fifaRank: 67, group: "Group A",
    stats: { attack: 73, midfield: 70, defense: 72 },
    recentForm: ['L', 'D', 'W', 'D', 'L'],
    starPlayers: ["Percy Tau", "Themba Zwane", "Ronwen Williams", "Bongani Zungu"],
    injuries: []
  },
  KOR: {
    id: "KOR", name: "South Korea", emoji: "🇰🇷", fifaRank: 23, group: "Group A",
    stats: { attack: 85, midfield: 84, defense: 82 },
    recentForm: ['W', 'W', 'D', 'W', 'L'],
    starPlayers: ["Son Heung-min", "Hwang Hee-chan", "Lee Kang-in", "Kim Min-jae"],
    injuries: [
      { playerName: "Lee Kang-in", severity: "low", description: "Ankle knock — limited training, likely to start" }
    ]
  },
  CZE: {
    id: "CZE", name: "Czechia", emoji: "🇨🇿", fifaRank: 38, group: "Group A",
    stats: { attack: 80, midfield: 81, defense: 80 },
    recentForm: ['D', 'W', 'L', 'W', 'D'],
    starPlayers: ["Patrik Schick", "Tomáš Souček", "Vladimír Coufal", "Lukáš Hrádecký"],
    injuries: [
      { playerName: "Patrik Schick", severity: "medium", description: "Hamstring tightness — doubtful for opener" }
    ]
  },

  // ── GROUP B ──────────────────────────────────────────────
  CAN: {
    id: "CAN", name: "Canada", emoji: "🇨🇦", fifaRank: 47, group: "Group B",
    stats: { attack: 79, midfield: 77, defense: 76 },
    recentForm: ['L', 'W', 'D', 'W', 'L'],
    starPlayers: ["Alphonso Davies", "Jonathan David", "Cyle Larin", "Milan Borjan"],
    injuries: [
      { playerName: "Alphonso Davies", severity: "low", description: "Calf tightness — should be fit" }
    ]
  },
  BIH: {
    id: "BIH", name: "Bosnia-Herzegovina", emoji: "🇧🇦", fifaRank: 54, group: "Group B",
    stats: { attack: 75, midfield: 73, defense: 72 },
    recentForm: ['D', 'L', 'W', 'D', 'W'],
    starPlayers: ["Edin Džeko", "Miralem Pjanić", "Saša Kalajdžić", "Armin Hodžić"],
    injuries: []
  },
  QAT: {
    id: "QAT", name: "Qatar", emoji: "🇶🇦", fifaRank: 37, group: "Group B",
    stats: { attack: 78, midfield: 77, defense: 77 },
    recentForm: ['W', 'W', 'D', 'L', 'W'],
    starPlayers: ["Akram Afif", "Almoez Ali", "Hassan Al-Haydos", "Meshaal Barsham"],
    injuries: []
  },
  SUI: {
    id: "SUI", name: "Switzerland", emoji: "🇨🇭", fifaRank: 19, group: "Group B",
    stats: { attack: 83, midfield: 84, defense: 84 },
    recentForm: ['W', 'W', 'D', 'W', 'L'],
    starPlayers: ["Granit Xhaka", "Xherdan Shaqiri", "Yann Sommer", "Manuel Akanji"],
    injuries: [
      { playerName: "Xherdan Shaqiri", severity: "medium", description: "Groin issue — questionable" }
    ]
  },

  // ── GROUP C ──────────────────────────────────────────────
  BRA: {
    id: "BRA", name: "Brazil", emoji: "🇧🇷", fifaRank: 6, group: "Group C",
    stats: { attack: 95, midfield: 91, defense: 90 },
    recentForm: ['W', 'W', 'W', 'D', 'W'],
    starPlayers: ["Vinícius Júnior", "Rodrygo", "Bruno Guimarães", "Marquinhos"],
    injuries: [
      { playerName: "Neymar Jr", severity: "high", description: "ACL recovery — ruled out of tournament" }
    ]
  },
  MAR: {
    id: "MAR", name: "Morocco", emoji: "🇲🇦", fifaRank: 13, group: "Group C",
    stats: { attack: 86, midfield: 87, defense: 88 },
    recentForm: ['W', 'W', 'D', 'W', 'W'],
    starPlayers: ["Achraf Hakimi", "Hakim Ziyech", "Sofyan Amrabat", "Yassine Bounou"],
    injuries: [
      { playerName: "Hakim Ziyech", severity: "low", description: "Ankle soreness — expected to play" }
    ]
  },
  HAI: {
    id: "HAI", name: "Haiti", emoji: "🇭🇹", fifaRank: 83, group: "Group C",
    stats: { attack: 68, midfield: 66, defense: 65 },
    recentForm: ['L', 'L', 'W', 'D', 'L'],
    starPlayers: ["Frantzdy Pierrot", "Duckens Nazon", "Steeven Saba", "Carlens Arcus"],
    injuries: []
  },
  SCO: {
    id: "SCO", name: "Scotland", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", fifaRank: 39, group: "Group C",
    stats: { attack: 79, midfield: 80, defense: 80 },
    recentForm: ['W', 'D', 'W', 'L', 'W'],
    starPlayers: ["Andy Robertson", "Scott McTominay", "Kieran Tierney", "Che Adams"],
    injuries: [
      { playerName: "Kieran Tierney", severity: "medium", description: "Knee issue — doubtful" }
    ]
  },

  // ── GROUP D ──────────────────────────────────────────────
  USA: {
    id: "USA", name: "United States", emoji: "🇺🇸", fifaRank: 14, group: "Group D",
    stats: { attack: 85, midfield: 84, defense: 83 },
    recentForm: ['W', 'W', 'D', 'W', 'W'],
    starPlayers: ["Christian Pulisic", "Weston McKennie", "Tyler Adams", "Antonee Robinson"],
    injuries: [
      { playerName: "Sergiño Dest", severity: "high", description: "Knee surgery — out of tournament" }
    ]
  },
  PAR: {
    id: "PAR", name: "Paraguay", emoji: "🇵🇾", fifaRank: 48, group: "Group D",
    stats: { attack: 76, midfield: 75, defense: 76 },
    recentForm: ['D', 'W', 'L', 'D', 'W'],
    starPlayers: ["Miguel Almirón", "Gustavo Gómez", "Ángel Romero", "Antony Silva"],
    injuries: []
  },
  AUS: {
    id: "AUS", name: "Australia", emoji: "🇦🇺", fifaRank: 25, group: "Group D",
    stats: { attack: 80, midfield: 80, defense: 79 },
    recentForm: ['W', 'D', 'L', 'W', 'W'],
    starPlayers: ["Mathew Ryan", "Mat Leckie", "Mitchell Duke", "Aziz Behich"],
    injuries: []
  },
  TUR: {
    id: "TUR", name: "Türkiye", emoji: "🇹🇷", fifaRank: 30, group: "Group D",
    stats: { attack: 83, midfield: 82, defense: 81 },
    recentForm: ['W', 'W', 'L', 'D', 'W'],
    starPlayers: ["Hakan Çalhanoğlu", "Arda Güler", "Kenan Yıldız", "Mert Müldür"],
    injuries: [
      { playerName: "Hakan Çalhanoğlu", severity: "low", description: "Muscle tightness — day to day" }
    ]
  },

  // ── GROUP E ──────────────────────────────────────────────
  GER: {
    id: "GER", name: "Germany", emoji: "🇩🇪", fifaRank: 12, group: "Group E",
    stats: { attack: 90, midfield: 93, defense: 89 },
    recentForm: ['W', 'W', 'W', 'D', 'W'],
    starPlayers: ["Jamal Musiala", "Florian Wirtz", "Kai Havertz", "Antonio Rüdiger"],
    injuries: [
      { playerName: "Marc-André ter Stegen", severity: "medium", description: "Back rehab — doubtful" }
    ]
  },
  CUW: {
    id: "CUW", name: "Curaçao", emoji: "🇨🇼", fifaRank: 96, group: "Group E",
    stats: { attack: 65, midfield: 63, defense: 62 },
    recentForm: ['L', 'D', 'L', 'W', 'L'],
    starPlayers: ["Leandro Bacuna", "Cuco Martina", "Sheraldo Becker", "Elson Hooi"],
    injuries: []
  },
  CIV: {
    id: "CIV", name: "Côte d'Ivoire", emoji: "🇨🇮", fifaRank: 20, group: "Group E",
    stats: { attack: 84, midfield: 83, defense: 82 },
    recentForm: ['W', 'W', 'D', 'W', 'D'],
    starPlayers: ["Sébastien Haller", "Franck Kessié", "Nicolas Pépé", "Serge Aurier"],
    injuries: [
      { playerName: "Sébastien Haller", severity: "medium", description: "Abdominal strain — doubtful" }
    ]
  },
  ECU: {
    id: "ECU", name: "Ecuador", emoji: "🇪🇨", fifaRank: 44, group: "Group E",
    stats: { attack: 78, midfield: 77, defense: 77 },
    recentForm: ['D', 'W', 'W', 'L', 'D'],
    starPlayers: ["Enner Valencia", "Moisés Caicedo", "Gonzalo Plata", "Piero Hincapié"],
    injuries: []
  },

  // ── GROUP F ──────────────────────────────────────────────
  NED: {
    id: "NED", name: "Netherlands", emoji: "🇳🇱", fifaRank: 7, group: "Group F",
    stats: { attack: 88, midfield: 88, defense: 89 },
    recentForm: ['W', 'W', 'D', 'W', 'W'],
    starPlayers: ["Virgil van Dijk", "Cody Gakpo", "Xavi Simons", "Memphis Depay"],
    injuries: [
      { playerName: "Memphis Depay", severity: "low", description: "Fatigue — rotational risk" }
    ]
  },
  JPN: {
    id: "JPN", name: "Japan", emoji: "🇯🇵", fifaRank: 17, group: "Group F",
    stats: { attack: 87, midfield: 88, defense: 86 },
    recentForm: ['W', 'W', 'W', 'W', 'D'],
    starPlayers: ["Kaoru Mitoma", "Takefusa Kubo", "Wataru Endo", "Daichi Kamada"],
    injuries: []
  },
  SWE: {
    id: "SWE", name: "Sweden", emoji: "🇸🇪", fifaRank: 28, group: "Group F",
    stats: { attack: 80, midfield: 80, defense: 80 },
    recentForm: ['W', 'D', 'W', 'L', 'W'],
    starPlayers: ["Alexander Isak", "Dejan Kulusevski", "Robin Quaison", "Victor Lindelöf"],
    injuries: []
  },
  TUN: {
    id: "TUN", name: "Tunisia", emoji: "🇹🇳", fifaRank: 29, group: "Group F",
    stats: { attack: 76, midfield: 76, defense: 77 },
    recentForm: ['D', 'D', 'W', 'L', 'D'],
    starPlayers: ["Youssef Msakni", "Hannibal Mejbri", "Seifeddine Jaziri", "Aïssa Laïdouni"],
    injuries: []
  },

  // ── GROUP G ──────────────────────────────────────────────
  BEL: {
    id: "BEL", name: "Belgium", emoji: "🇧🇪", fifaRank: 9, group: "Group G",
    stats: { attack: 89, midfield: 88, defense: 87 },
    recentForm: ['W', 'W', 'W', 'D', 'W'],
    starPlayers: ["Kevin De Bruyne", "Romelu Lukaku", "Thibaut Courtois", "Youri Tielemans"],
    injuries: [
      { playerName: "Eden Hazard", severity: "high", description: "Retired — not in squad" }
    ]
  },
  EGY: {
    id: "EGY", name: "Egypt", emoji: "🇪🇬", fifaRank: 35, group: "Group G",
    stats: { attack: 81, midfield: 79, defense: 80 },
    recentForm: ['W', 'D', 'W', 'W', 'D'],
    starPlayers: ["Mohamed Salah", "Omar Marmoush", "Mostafa Mohamed", "Mohamed El-Shenawy"],
    injuries: [
      { playerName: "Mohamed Salah", severity: "low", description: "Managed carefully — fit to start" }
    ]
  },
  IRN: {
    id: "IRN", name: "Iran", emoji: "🇮🇷", fifaRank: 22, group: "Group G",
    stats: { attack: 79, midfield: 79, defense: 79 },
    recentForm: ['W', 'W', 'D', 'W', 'L'],
    starPlayers: ["Sardar Azmoun", "Mehdi Taremi", "Alireza Jahanbakhsh", "Ali Beiranvand"],
    injuries: []
  },
  NZL: {
    id: "NZL", name: "New Zealand", emoji: "🇳🇿", fifaRank: 99, group: "Group G",
    stats: { attack: 66, midfield: 65, defense: 66 },
    recentForm: ['W', 'L', 'D', 'L', 'W'],
    starPlayers: ["Chris Wood", "Tommy Smith", "Clayton Lewis", "Liberato Cacace"],
    injuries: []
  },

  // ── GROUP H ──────────────────────────────────────────────
  ESP: {
    id: "ESP", name: "Spain", emoji: "🇪🇸", fifaRank: 2, group: "Group H",
    stats: { attack: 92, midfield: 97, defense: 91 },
    recentForm: ['W', 'W', 'W', 'W', 'W'],
    starPlayers: ["Lamine Yamal", "Pedri", "Rodri", "Nico Williams"],
    injuries: [
      { playerName: "Gavi", severity: "high", description: "Knee ligament — unavailable" }
    ]
  },
  CPV: {
    id: "CPV", name: "Cape Verde", emoji: "🇨🇻", fifaRank: 87, group: "Group H",
    stats: { attack: 69, midfield: 67, defense: 68 },
    recentForm: ['D', 'W', 'L', 'D', 'W'],
    starPlayers: ["Garry Rodrigues", "Júlio Tavares", "Dylan Tavares", "Jovane Cabral"],
    injuries: []
  },
  KSA: {
    id: "KSA", name: "Saudi Arabia", emoji: "🇸🇦", fifaRank: 56, group: "Group H",
    stats: { attack: 73, midfield: 72, defense: 72 },
    recentForm: ['L', 'W', 'D', 'L', 'W'],
    starPlayers: ["Salem Al-Dawsari", "Mohammed Al-Owais", "Firas Al-Buraikan", "Ali Al-Bulaihi"],
    injuries: []
  },
  URU: {
    id: "URU", name: "Uruguay", emoji: "🇺🇾", fifaRank: 10, group: "Group H",
    stats: { attack: 87, midfield: 86, defense: 87 },
    recentForm: ['W', 'W', 'D', 'W', 'W'],
    starPlayers: ["Darwin Núñez", "Federico Valverde", "Rodrigo Bentancur", "José María Giménez"],
    injuries: []
  },

  // ── GROUP I ──────────────────────────────────────────────
  FRA: {
    id: "FRA", name: "France", emoji: "🇫🇷", fifaRank: 1, group: "Group I",
    stats: { attack: 96, midfield: 91, defense: 92 },
    recentForm: ['W', 'W', 'W', 'D', 'W'],
    starPlayers: ["Kylian Mbappé", "Antoine Griezmann", "William Saliba", "Mike Maignan"],
    injuries: [
      { playerName: "Aurélien Tchouaméni", severity: "medium", description: "Metatarsal stress — doubtful" }
    ]
  },
  SEN: {
    id: "SEN", name: "Senegal", emoji: "🇸🇳", fifaRank: 18, group: "Group I",
    stats: { attack: 85, midfield: 84, defense: 86 },
    recentForm: ['W', 'W', 'D', 'W', 'D'],
    starPlayers: ["Sadio Mané", "Kalidou Koulibaly", "Nicolas Jackson", "Édouard Mendy"],
    injuries: []
  },
  IRQ: {
    id: "IRQ", name: "Iraq", emoji: "🇮🇶", fifaRank: 70, group: "Group I",
    stats: { attack: 70, midfield: 69, defense: 68 },
    recentForm: ['D', 'W', 'L', 'D', 'W'],
    starPlayers: ["Aymen Hussein", "Amjed Attwan", "Ahmed Yasin", "Jalal Hachim"],
    injuries: []
  },
  NOR: {
    id: "NOR", name: "Norway", emoji: "🇳🇴", fifaRank: 27, group: "Group I",
    stats: { attack: 84, midfield: 81, defense: 80 },
    recentForm: ['W', 'D', 'W', 'W', 'L'],
    starPlayers: ["Erling Haaland", "Martin Ødegaard", "Alexander Sørloth", "Ørjan Nyland"],
    injuries: [
      { playerName: "Martin Ødegaard", severity: "low", description: "Ankle knock — day to day" }
    ]
  },

  // ── GROUP J ──────────────────────────────────────────────
  ARG: {
    id: "ARG", name: "Argentina", emoji: "🇦🇷", fifaRank: 3, group: "Group J",
    stats: { attack: 95, midfield: 92, defense: 90 },
    recentForm: ['W', 'W', 'W', 'W', 'D'],
    starPlayers: ["Lionel Messi", "Alexis Mac Allister", "Lautaro Martínez", "Emiliano Martínez"],
    injuries: [
      { playerName: "Rodrigo De Paul", severity: "medium", description: "Hamstring — doubtful for opener" }
    ]
  },
  DZA: {
    id: "DZA", name: "Algeria", emoji: "🇩🇿", fifaRank: 33, group: "Group J",
    stats: { attack: 79, midfield: 78, defense: 78 },
    recentForm: ['W', 'D', 'D', 'W', 'W'],
    starPlayers: ["Riyad Mahrez", "Islam Slimani", "Sofiane Feghouli", "Rais M'Bolhi"],
    injuries: [
      { playerName: "Riyad Mahrez", severity: "low", description: "Resting — expected to start" }
    ]
  },
  AUT: {
    id: "AUT", name: "Austria", emoji: "🇦🇹", fifaRank: 26, group: "Group J",
    stats: { attack: 82, midfield: 83, defense: 82 },
    recentForm: ['W', 'W', 'L', 'W', 'D'],
    starPlayers: ["Marcel Sabitzer", "David Alaba", "Marko Arnautović", "Patrick Wimmer"],
    injuries: [
      { playerName: "David Alaba", severity: "high", description: "ACL recovery — ruled out" }
    ]
  },
  JOR: {
    id: "JOR", name: "Jordan", emoji: "🇯🇴", fifaRank: 75, group: "Group J",
    stats: { attack: 69, midfield: 68, defense: 69 },
    recentForm: ['D', 'W', 'D', 'L', 'W'],
    starPlayers: ["Yazan Al-Naimat", "Mousa Al-Tamari", "Baha' Faisal", "Amer Shafi"],
    injuries: []
  },

  // ── GROUP K ──────────────────────────────────────────────
  POR: {
    id: "POR", name: "Portugal", emoji: "🇵🇹", fifaRank: 5, group: "Group K",
    stats: { attack: 93, midfield: 93, defense: 90 },
    recentForm: ['W', 'W', 'W', 'W', 'W'],
    starPlayers: ["Cristiano Ronaldo", "Bruno Fernandes", "Bernardo Silva", "Rúben Dias"],
    injuries: [
      { playerName: "Diogo Jota", severity: "medium", description: "Rib injury — questionable" }
    ]
  },
  COD: {
    id: "COD", name: "DR Congo", emoji: "🇨🇩", fifaRank: 51, group: "Group K",
    stats: { attack: 74, midfield: 72, defense: 72 },
    recentForm: ['W', 'D', 'L', 'W', 'D'],
    starPlayers: ["Yannick Bolasie", "Cedric Bakambu", "Arthur Masuaku", "Chancel Mbemba"],
    injuries: []
  },
  UZB: {
    id: "UZB", name: "Uzbekistan", emoji: "🇺🇿", fifaRank: 62, group: "Group K",
    stats: { attack: 72, midfield: 71, defense: 71 },
    recentForm: ['W', 'L', 'W', 'D', 'W'],
    starPlayers: ["Eldor Shomurodov", "Jaloliddin Masharipov", "Abbosbek Fayzullaev", "Sarvarbek Tursunov"],
    injuries: []
  },
  COL: {
    id: "COL", name: "Colombia", emoji: "🇨🇴", fifaRank: 11, group: "Group K",
    stats: { attack: 87, midfield: 88, defense: 85 },
    recentForm: ['W', 'W', 'D', 'W', 'W'],
    starPlayers: ["James Rodríguez", "Luis Díaz", "Rafael Santos Borré", "Davinson Sánchez"],
    injuries: []
  },

  // ── GROUP L ──────────────────────────────────────────────
  ENG: {
    id: "ENG", name: "England", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", fifaRank: 4, group: "Group L",
    stats: { attack: 93, midfield: 94, defense: 88 },
    recentForm: ['W', 'W', 'W', 'D', 'W'],
    starPlayers: ["Harry Kane", "Jude Bellingham", "Bukayo Saka", "Declan Rice"],
    injuries: [
      { playerName: "Luke Shaw", severity: "medium", description: "Hamstring — unlikely to feature" }
    ]
  },
  CRO: {
    id: "CRO", name: "Croatia", emoji: "🇭🇷", fifaRank: 15, group: "Group L",
    stats: { attack: 84, midfield: 90, defense: 86 },
    recentForm: ['D', 'W', 'W', 'D', 'W'],
    starPlayers: ["Luka Modrić", "Mateo Kovačić", "Joško Gvardiol", "Andrej Kramarić"],
    injuries: []
  },
  GHA: {
    id: "GHA", name: "Ghana", emoji: "🇬🇭", fifaRank: 60, group: "Group L",
    stats: { attack: 76, midfield: 75, defense: 74 },
    recentForm: ['D', 'L', 'W', 'W', 'D'],
    starPlayers: ["André Ayew", "Jordan Ayew", "Mohammed Kudus", "Thomas Partey"],
    injuries: [
      { playerName: "Thomas Partey", severity: "high", description: "Thigh injury — out of tournament" }
    ]
  },
  PAN: {
    id: "PAN", name: "Panama", emoji: "🇵🇦", fifaRank: 49, group: "Group L",
    stats: { attack: 72, midfield: 71, defense: 73 },
    recentForm: ['L', 'D', 'W', 'L', 'D'],
    starPlayers: ["Rolando Blackburn", "Adalberto Carrasquilla", "Gabriel Torres", "Édgar Barcenas"],
    injuries: []
  }
};

// ── MATCHDAY 1 FIXTURES ──────────────────────────────────────────────────────
export const initialMatches: Match[] = [
  // ── MATCHDAY 1 ──────────────────────────────────────────────────────────────
  // Group A (Jun 11–12)
  { id: "a1", teamAId: "MEX", teamBId: "RSA", date: "2026-06-11T19:00:00Z", stage: "Group A – MD1", status: "upcoming" },
  { id: "a2", teamAId: "KOR", teamBId: "CZE", date: "2026-06-12T02:00:00Z", stage: "Group A – MD1", status: "upcoming" },
  // Group B (Jun 12–13)
  { id: "b1", teamAId: "CAN", teamBId: "BIH", date: "2026-06-12T19:00:00Z", stage: "Group B – MD1", status: "upcoming" },
  { id: "b2", teamAId: "QAT", teamBId: "SUI", date: "2026-06-13T19:00:00Z", stage: "Group B – MD1", status: "upcoming" },
  // Group C (Jun 13–14)
  { id: "c1", teamAId: "BRA", teamBId: "MAR", date: "2026-06-13T22:00:00Z", stage: "Group C – MD1", status: "upcoming" },
  { id: "c2", teamAId: "HAI", teamBId: "SCO", date: "2026-06-14T01:00:00Z", stage: "Group C – MD1", status: "upcoming" },
  // Group D (Jun 13–14)
  { id: "d1", teamAId: "USA", teamBId: "PAR", date: "2026-06-13T01:00:00Z", stage: "Group D – MD1", status: "upcoming" },
  { id: "d2", teamAId: "AUS", teamBId: "TUR", date: "2026-06-14T04:00:00Z", stage: "Group D – MD1", status: "upcoming" },
  // Group E (Jun 14–15)
  { id: "e1", teamAId: "GER", teamBId: "CUW", date: "2026-06-14T17:00:00Z", stage: "Group E – MD1", status: "upcoming" },
  { id: "e2", teamAId: "CIV", teamBId: "ECU", date: "2026-06-15T20:00:00Z", stage: "Group E – MD1", status: "upcoming" },
  // Group F (Jun 15)
  { id: "f1", teamAId: "NED", teamBId: "JPN", date: "2026-06-15T17:00:00Z", stage: "Group F – MD1", status: "upcoming" },
  { id: "f2", teamAId: "SWE", teamBId: "TUN", date: "2026-06-15T23:00:00Z", stage: "Group F – MD1", status: "upcoming" },
  // Group G (Jun 16)
  { id: "g1", teamAId: "BEL", teamBId: "EGY", date: "2026-06-16T17:00:00Z", stage: "Group G – MD1", status: "upcoming" },
  { id: "g2", teamAId: "IRN", teamBId: "NZL", date: "2026-06-16T20:00:00Z", stage: "Group G – MD1", status: "upcoming" },
  // Group H (Jun 17)
  { id: "h1", teamAId: "ESP", teamBId: "CPV", date: "2026-06-17T17:00:00Z", stage: "Group H – MD1", status: "upcoming" },
  { id: "h2", teamAId: "KSA", teamBId: "URU", date: "2026-06-17T20:00:00Z", stage: "Group H – MD1", status: "upcoming" },
  // Group I (Jun 18) — FIXED: France vs Senegal
  { id: "i1", teamAId: "FRA", teamBId: "SEN", date: "2026-06-18T17:00:00Z", stage: "Group I – MD1", status: "upcoming" },
  { id: "i2", teamAId: "IRQ", teamBId: "NOR", date: "2026-06-18T20:00:00Z", stage: "Group I – MD1", status: "upcoming" },
  // Group J (Jun 19)
  { id: "j1", teamAId: "ARG", teamBId: "JOR", date: "2026-06-19T17:00:00Z", stage: "Group J – MD1", status: "upcoming" },
  { id: "j2", teamAId: "DZA", teamBId: "AUT", date: "2026-06-19T20:00:00Z", stage: "Group J – MD1", status: "upcoming" },
  // Group K (Jun 20)
  { id: "k1", teamAId: "POR", teamBId: "UZB", date: "2026-06-20T17:00:00Z", stage: "Group K – MD1", status: "upcoming" },
  { id: "k2", teamAId: "COD", teamBId: "COL", date: "2026-06-20T20:00:00Z", stage: "Group K – MD1", status: "upcoming" },
  // Group L (Jun 21)
  { id: "l1", teamAId: "ENG", teamBId: "GHA", date: "2026-06-21T20:00:00Z", stage: "Group L – MD1", status: "upcoming" },
  { id: "l2", teamAId: "CRO", teamBId: "PAN", date: "2026-06-21T17:00:00Z", stage: "Group L – MD1", status: "upcoming" },

  // ── MATCHDAY 2 ──────────────────────────────────────────────────────────────
  // Groups A+B (Jun 22)
  { id: "a3", teamAId: "MEX", teamBId: "KOR", date: "2026-06-22T17:00:00Z", stage: "Group A – MD2", status: "upcoming" },
  { id: "a4", teamAId: "RSA", teamBId: "CZE", date: "2026-06-22T20:00:00Z", stage: "Group A – MD2", status: "upcoming" },
  { id: "b3", teamAId: "CAN", teamBId: "QAT", date: "2026-06-22T23:00:00Z", stage: "Group B – MD2", status: "upcoming" },
  { id: "b4", teamAId: "BIH", teamBId: "SUI", date: "2026-06-23T02:00:00Z", stage: "Group B – MD2", status: "upcoming" },
  // Groups C+D (Jun 24)
  { id: "c3", teamAId: "BRA", teamBId: "HAI", date: "2026-06-24T17:00:00Z", stage: "Group C – MD2", status: "upcoming" },
  { id: "c4", teamAId: "MAR", teamBId: "SCO", date: "2026-06-24T20:00:00Z", stage: "Group C – MD2", status: "upcoming" },
  { id: "d3", teamAId: "USA", teamBId: "AUS", date: "2026-06-24T23:00:00Z", stage: "Group D – MD2", status: "upcoming" },
  { id: "d4", teamAId: "PAR", teamBId: "TUR", date: "2026-06-25T02:00:00Z", stage: "Group D – MD2", status: "upcoming" },
  // Groups E+F (Jun 26)
  { id: "e3", teamAId: "GER", teamBId: "CIV", date: "2026-06-26T17:00:00Z", stage: "Group E – MD2", status: "upcoming" },
  { id: "e4", teamAId: "CUW", teamBId: "ECU", date: "2026-06-26T20:00:00Z", stage: "Group E – MD2", status: "upcoming" },
  { id: "f3", teamAId: "NED", teamBId: "SWE", date: "2026-06-26T23:00:00Z", stage: "Group F – MD2", status: "upcoming" },
  { id: "f4", teamAId: "JPN", teamBId: "TUN", date: "2026-06-27T02:00:00Z", stage: "Group F – MD2", status: "upcoming" },
  // Groups G+H (Jun 28)
  { id: "g3", teamAId: "BEL", teamBId: "IRN", date: "2026-06-28T17:00:00Z", stage: "Group G – MD2", status: "upcoming" },
  { id: "g4", teamAId: "EGY", teamBId: "NZL", date: "2026-06-28T20:00:00Z", stage: "Group G – MD2", status: "upcoming" },
  { id: "h3", teamAId: "ESP", teamBId: "KSA", date: "2026-06-28T23:00:00Z", stage: "Group H – MD2", status: "upcoming" },
  { id: "h4", teamAId: "CPV", teamBId: "URU", date: "2026-06-29T02:00:00Z", stage: "Group H – MD2", status: "upcoming" },
  // Groups I+J (Jun 30)
  { id: "i3", teamAId: "FRA", teamBId: "IRQ", date: "2026-06-30T17:00:00Z", stage: "Group I – MD2", status: "upcoming" },
  { id: "i4", teamAId: "SEN", teamBId: "NOR", date: "2026-06-30T20:00:00Z", stage: "Group I – MD2", status: "upcoming" },
  { id: "j3", teamAId: "ARG", teamBId: "DZA", date: "2026-06-30T23:00:00Z", stage: "Group J – MD2", status: "upcoming" },
  { id: "j4", teamAId: "JOR", teamBId: "AUT", date: "2026-07-01T02:00:00Z", stage: "Group J – MD2", status: "upcoming" },
  // Groups K+L (Jul 2)
  { id: "k3", teamAId: "POR", teamBId: "COD", date: "2026-07-02T17:00:00Z", stage: "Group K – MD2", status: "upcoming" },
  { id: "k4", teamAId: "UZB", teamBId: "COL", date: "2026-07-02T20:00:00Z", stage: "Group K – MD2", status: "upcoming" },
  { id: "l3", teamAId: "ENG", teamBId: "CRO", date: "2026-07-02T23:00:00Z", stage: "Group L – MD2", status: "upcoming" },
  { id: "l4", teamAId: "GHA", teamBId: "PAN", date: "2026-07-03T02:00:00Z", stage: "Group L – MD2", status: "upcoming" },

  // ── MATCHDAY 3 (simultaneous within each group) ──────────────────────────────
  // Groups A+B (Jul 4)
  { id: "a5", teamAId: "MEX", teamBId: "CZE", date: "2026-07-04T17:00:00Z", stage: "Group A – MD3", status: "upcoming" },
  { id: "a6", teamAId: "KOR", teamBId: "RSA", date: "2026-07-04T17:00:00Z", stage: "Group A – MD3", status: "upcoming" },
  { id: "b5", teamAId: "CAN", teamBId: "SUI", date: "2026-07-04T20:00:00Z", stage: "Group B – MD3", status: "upcoming" },
  { id: "b6", teamAId: "QAT", teamBId: "BIH", date: "2026-07-04T20:00:00Z", stage: "Group B – MD3", status: "upcoming" },
  // Groups C+D (Jul 5)
  { id: "c5", teamAId: "BRA", teamBId: "SCO", date: "2026-07-05T17:00:00Z", stage: "Group C – MD3", status: "upcoming" },
  { id: "c6", teamAId: "MAR", teamBId: "HAI", date: "2026-07-05T17:00:00Z", stage: "Group C – MD3", status: "upcoming" },
  { id: "d5", teamAId: "USA", teamBId: "TUR", date: "2026-07-05T20:00:00Z", stage: "Group D – MD3", status: "upcoming" },
  { id: "d6", teamAId: "PAR", teamBId: "AUS", date: "2026-07-05T20:00:00Z", stage: "Group D – MD3", status: "upcoming" },
  // Groups E+F (Jul 6)
  { id: "e5", teamAId: "GER", teamBId: "ECU", date: "2026-07-06T17:00:00Z", stage: "Group E – MD3", status: "upcoming" },
  { id: "e6", teamAId: "CIV", teamBId: "CUW", date: "2026-07-06T17:00:00Z", stage: "Group E – MD3", status: "upcoming" },
  { id: "f5", teamAId: "NED", teamBId: "TUN", date: "2026-07-06T20:00:00Z", stage: "Group F – MD3", status: "upcoming" },
  { id: "f6", teamAId: "SWE", teamBId: "JPN", date: "2026-07-06T20:00:00Z", stage: "Group F – MD3", status: "upcoming" },
  // Groups G+H (Jul 7)
  { id: "g5", teamAId: "BEL", teamBId: "NZL", date: "2026-07-07T17:00:00Z", stage: "Group G – MD3", status: "upcoming" },
  { id: "g6", teamAId: "EGY", teamBId: "IRN", date: "2026-07-07T17:00:00Z", stage: "Group G – MD3", status: "upcoming" },
  { id: "h5", teamAId: "ESP", teamBId: "URU", date: "2026-07-07T20:00:00Z", stage: "Group H – MD3", status: "upcoming" },
  { id: "h6", teamAId: "KSA", teamBId: "CPV", date: "2026-07-07T20:00:00Z", stage: "Group H – MD3", status: "upcoming" },
  // Groups I+J (Jul 8)
  { id: "i5", teamAId: "FRA", teamBId: "NOR", date: "2026-07-08T17:00:00Z", stage: "Group I – MD3", status: "upcoming" },
  { id: "i6", teamAId: "SEN", teamBId: "IRQ", date: "2026-07-08T17:00:00Z", stage: "Group I – MD3", status: "upcoming" },
  { id: "j5", teamAId: "ARG", teamBId: "AUT", date: "2026-07-08T20:00:00Z", stage: "Group J – MD3", status: "upcoming" },
  { id: "j6", teamAId: "JOR", teamBId: "DZA", date: "2026-07-08T20:00:00Z", stage: "Group J – MD3", status: "upcoming" },
  // Groups K+L (Jul 9)
  { id: "k5", teamAId: "POR", teamBId: "COL", date: "2026-07-09T17:00:00Z", stage: "Group K – MD3", status: "upcoming" },
  { id: "k6", teamAId: "UZB", teamBId: "COD", date: "2026-07-09T17:00:00Z", stage: "Group K – MD3", status: "upcoming" },
  { id: "l5", teamAId: "ENG", teamBId: "PAN", date: "2026-07-09T20:00:00Z", stage: "Group L – MD3", status: "upcoming" },
  { id: "l6", teamAId: "GHA", teamBId: "CRO", date: "2026-07-09T20:00:00Z", stage: "Group L – MD3", status: "upcoming" },
];

export const initialAgents: AgentState[] = [
  {
    id: "injury",
    name: "Injury Analyst Agent",
    weight: 0.30,
    avatar: "🏥",
    description: "Evaluates squad availability, key player absences, and fitness metrics to calculate penalties and boosts.",
    coreMetric: "Squad Health %",
    status: "idle"
  },
  {
    id: "standings",
    name: "Form & Standings Agent",
    weight: 0.40,
    avatar: "📊",
    description: "Analyses FIFA rankings, historic head-to-head records, defensive/offensive ratings, and recent match forms.",
    coreMetric: "Form Coefficient",
    status: "idle"
  },
  {
    id: "sentiment",
    name: "Tournament Context Agent",
    weight: 0.30,
    avatar: "🏆",
    description: "Analyses live group standings, qualification scenarios, matchday pressure, and tournament momentum to assess incentive structures.",
    coreMetric: "Group Pressure Index",
    status: "idle"
  }
];

export function getMatchSentiment(teamAId: string, teamBId: string) {
  const teamA = teams[teamAId];
  const teamB = teams[teamBId];
  if (!teamA || !teamB) return { winA: 33, draw: 34, winB: 33, oddsA: 2.5, oddsB: 2.5 };

  const totalA = teamA.stats.attack + teamA.stats.midfield + teamA.stats.defense;
  const totalB = teamB.stats.attack + teamB.stats.midfield + teamB.stats.defense;
  const diff = totalA - totalB;
  let winAProb = 40 + (diff * 1.5);
  let winBProb = 40 - (diff * 1.5);

  if (winAProb < 10) winAProb = 10;
  if (winAProb > 80) winAProb = 80;
  if (winBProb < 10) winBProb = 10;
  if (winBProb > 80) winBProb = 80;
  const drawProb = 100 - winAProb - winBProb;

  return {
    winA: Math.round(winAProb),
    draw: Math.round(drawProb),
    winB: Math.round(winBProb),
    oddsA: parseFloat((95 / winAProb).toFixed(2)),
    oddsB: parseFloat((95 / winBProb).toFixed(2)),
    oddsDraw: parseFloat((95 / drawProb).toFixed(2))
  };
}
