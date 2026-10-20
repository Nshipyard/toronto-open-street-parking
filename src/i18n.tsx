"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "en" | "fr";

const en = {
  banner: {
    line: "An open-source civic project by Nshipyard. Not affiliated with the Government of Canada or the City of Toronto.",
    badge: "Open source",
  },
  nav: { explorer: "Explorer", gaps: "What's missing", developers: "Developers", data: "Data", back: "All projects" },
  hero: {
    kicker: "Open Nshipyard · Toronto Open Street Parking",
    title: "Toronto street parking data in one file",
    lead: "Every open Toronto dataset about street parking, joined into one file: 50,027 road segments. Snow routes and parking stall locations are not in it, because the city does not publish them.",
    sub: "Toronto's Parking Authority manages about 21,000 paid on-street spaces worth $67.7 million a year. The City knows where every stall, sign, and meter is: a contractor drives the streets with cameras and builds that inventory. It is not open data. This project inventories every public dataset that describes street parking, joins what can be joined into one open street parking dataset, and documents the rest as gaps, with the search evidence for each one.",
    cta1: "Browse the inventory",
    cta2: "Read the gap report",
  },
  statsLabels: [
    "City datasets that describe street parking, inventoried from the open data catalogue",
    "street segments in the joined dataset, each carrying every attribute the public data allows",
    "current street parking rules in the traffic by-law, published as legal text, not as data with locations",
    "public datasets that list individual paid parking stalls: the inventory the City holds privately",
  ],
  explorer: {
    kicker: "Explorer",
    title: "Every dataset that describes street parking, and what could be joined.",
    body: "The catalogue was searched with 51 queries on October 20, 2026. 371 datasets matched a keyword; the 34 below describe street parking itself. Filter by the question a dataset answers: who may park on the street, where, when, at what price, what blocks it, how it is used, how it is enforced.",
    search: "Search datasets, e.g. snow, permit, green p…",
    allAttrs: "All questions",
    attrs: { who: "Who may park", where: "Where", when: "When", price: "At what price", blocks: "What blocks it", use: "How it is used", enforcement: "Enforcement" },
    joinedOnly: "Joined into the dataset",
    notJoinedOnly: "Not joined",
    allJoin: "All join states",
    colTitle: "Dataset",
    colUpdated: "Updated",
    colRefresh: "Refresh",
    colFormats: "Formats",
    colGeometry: "Geometry",
    colStatus: "Join status",
    joinedWord: "Joined",
    notJoinedWord: "Not joined",
    streetTitle: "Look up a street in the joined dataset",
    streetBody: "Each street profile aggregates its segments: how many carry bike infrastructure, how many sit in a permit parking area, how many by-law rules name the street, and how many tickets were written on it from 2023 to 2025.",
    streetSearch: "Type a street, e.g. Queen St W, Yonge, Danforth…",
    colStreet: "Street",
    colSegments: "Segments",
    colLength: "Length",
    colBike: "With bike infra",
    colPermit: "In permit area",
    colRules: "By-law rules",
    colTickets: "Tickets 2023-25",
    noResult: "Nothing matches. Try a dataset keyword or a street name.",
  },
  showcase: {
    kicker: "The joins",
    title: "What joined, what did not, and the rate for each.",
    body: "One row of the joined dataset is one centreline road segment. Spatial layers joined on geometry. The by-law rules and the tickets carry no geometry, so they joined on the street name, which is the finest key they offer. Every rate below is computed from the join itself.",
    colJoin: "Join",
    colMethod: "Key",
    colMatched: "Matched",
    colRate: "Match rate",
    topStreets: "Most-ticketed streets and their street parking profile",
    topStreetsBody: "Ticket counts are 2023-2025 totals from the ticket slice. Rules are the count of current Chapter 950 street parking rules that name the street.",
  },
  gaps: {
    kicker: "The gap report",
    title: "What the City knows about street parking that you cannot download.",
    body: "A gap is listed only where a search backs it. Each entry states what was searched, what the catalogue returned instead, and where the missing data is known to exist. Kinds: missing (no dataset at all), text-only (published as legal text with no usable locations), stale (published once, not maintained), partial (published for some streets only).",
    kindLabels: { missing: "Missing", "text-only": "Text only", stale: "Stale", partial: "Partial" },
  },
  developers: {
    kicker: "For developers",
    title: "Query it from code, or from an agent.",
    body: "Three consumption paths, same canonical data. REST for applications, OpenAPI for integration, MCP tools over streamable HTTP for AI agents.",
    endpoints: "Endpoints",
    tryIt: "Try it",
    openapi: "OpenAPI spec",
  },
  downloads: {
    kicker: "Data",
    title: "Take the files.",
    body: "The joined dataset, the inventory, the flattened by-law rules, and the data dictionary. MIT licensed. Source datasets remain the City's, under the Open Government Licence, Toronto.",
    download: "Download",
  },
  methodology: {
    kicker: "Methodology",
    title: "How the inventory and the joins were built.",
    points: [
      "Inventory: the catalogue was searched through the CKAN API (package_search) with 51 queries covering parking, snow, loading, permits, cycling, signs, stalls, meters, and street geometry. 371 datasets matched a keyword. A dataset enters the inventory when its records describe street parking: who may park, stop, or load, where, when, at what price, what blocks a parking space, or how street parking is used or enforced. The other matches mention street parking only in passing (a street in an address, parking in a survey).",
      "Spine: Toronto Centreline, 64,392 features, filtered to 50,027 road segments. Trails, railways, rivers, and walkways were removed because they have no street parking. Segment geometry is the only geometry the joined dataset asserts as its own.",
      "Spatial joins ran in EPSG:2952 (MTM zone 10). Bike infrastructure joined when a bikeway line falls within 25 metres of a segment and carries the same street name. Permit parking joined by testing each segment's midpoint against the 97 permit-area polygons. Facilities joined as counts within 250 metres of a segment's midpoint, plus the distance to the nearest Green P car park.",
      "The by-law schedules and the tickets have no geometry, so they joined on normalized street names. Rule counts and ticket counts therefore attach at street level: every segment of a street carries the street's counts. Normalization expands street types (Street to ST, Avenue to AVE), strips district markers like '(TO)', and folds direction words (West to W).",
      "Current rules: of 77,940 by-law records, 13,914 carry a latest action of 'Repealed' and were dropped. 46,455 carry an empty latest-action status and were kept as current. Empty is not proof a rule is in force; it is the absence of a repeal record. The kept set is 27,768 rules across 18 street parking categories.",
      "Green P joined to parking occupancy by car park number (Green P id 52 to occupancy CP52), keeping the latest quarter. The Green P file is a 2019 snapshot the catalogue marks 'Will not be Refreshed'; occupancy runs to the latest published quarter. Where the two disagree on capacity, both values are kept in the facility file.",
      "What the joined dataset cannot do: place a rule on a specific segment (the by-law gives street, side, and a text extent), say whether a space is free (no on-street occupancy exists), or price a specific stall (rates exist per Green P facility, as text). Those limits are the gap report, not defects of the join.",
    ],
  },
  footer: {
    line: "An open-source civic project by Nshipyard. Not affiliated with the Government of Canada or the City of Toronto.",
    sources: "Sources: City of Toronto Open Data (CKAN catalogue, searched 2026-10-20); Toronto Parking Authority 2026 Operating Budget report; SenSen case study, 'Digitising the Streets of Toronto: AI-powered Curb Mapping' (sensen.ai). Ticket slice: the toronto-parking-tickets-geocoded project (City of Toronto Parking Tickets, 2023-2025).",
  },
  mcp: {
    kicker: "Connect your agent",
    title: "Put this data to work inside your AI tools.",
    body: "Pick your harness, copy the prompt, send it to your agent. Your agent runs the setup itself.",
    tabs: { chatgpt: "ChatGPT", claude: "Claude", claudecode: "Claude Code", cli: "CLI", other: "Other" },
    cardTitle: "Copy and send this to {tab}",
    copy: "Copy",
    copied: "Copied",
    chatgptNote: "ChatGPT connects through the documented REST API rather than MCP directly.",
    pChatgpt:
      "I want to use the {displayName} through its API.\n- OpenAPI spec: {origin}/api/openapi.json\n- REST base: {origin}/api/v1\nFirst tell me in two sentences what this API offers, then {exampleLower}, and show me the result.",
    pClaude:
      "In Claude (claude.ai), open Settings, then Connectors, and add a custom connector:\n- Name: {displayName}\n- URL: {origin}/mcp\nThen list the available tools, {exampleLower}, and show me the result.",
    pClaudeCode:
      "Set up the {displayName} MCP server so I can query it from here.\n1. Run: claude mcp add --transport http {slug} {origin}/mcp\n2. Run `claude mcp list` to confirm it connected.\n3. {example}, and show me the result.",
    pCli:
      "# MCP endpoint (streamable HTTP)\n{origin}/mcp\n\n# List the available tools\ncurl -s -X POST {origin}/mcp -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'",
    otherTitle: "Everything else",
    otherBody: "Any harness that speaks MCP over streamable HTTP, or plain REST.",
    mcpEndpoint: "MCP endpoint",
    openapiSpec: "OpenAPI spec",
    restBase: "REST base",
  },
};

const fr: Dict = {
  banner: {
    line: "Un projet civique à code source ouvert par Nshipyard. Sans affiliation avec le gouvernement du Canada ni la Ville de Toronto.",
    badge: "Code source ouvert",
  },
  nav: { explorer: "Explorateur", gaps: "Ce qui manque", developers: "Développeurs", data: "Données", back: "Tous les projets" },
  hero: {
    kicker: "Open Nshipyard · Toronto Open Street Parking",
    title: "Les données sur le stationnement sur rue de Toronto dans un seul fichier",
    lead: "Chaque jeu de données ouvert de Toronto sur le stationnement sur rue, joint en un seul fichier : 50 027 segments de rue. Les routes de déneigement et les emplacements des places de stationnement n'y figurent pas, parce que la ville ne les publie pas.",
    sub: "La Toronto Parking Authority gère environ 21 000 places payantes sur rue, d'une valeur de 67,7 millions de dollars par an. La Ville sait où se trouve chaque place, chaque panneau et chaque parcomètre : un entrepreneur parcourt les rues avec des caméras et construit cet inventaire. Ce n'est pas une donnée ouverte. Ce projet recense chaque jeu de données public qui décrit le stationnement sur rue, joint ce qui peut l'être en un seul jeu de données ouvert, et documente le reste comme des manques, avec les preuves de recherche pour chacun.",
    cta1: "Parcourir l'inventaire",
    cta2: "Lire le rapport des manques",
  },
  statsLabels: [
    "jeux de données de la Ville qui décrivent le stationnement sur rue, recensés dans le catalogue de données ouvertes",
    "segments de rue dans le jeu joint, chacun portant tous les attributs que les données publiques permettent",
    "règles de stationnement sur rue en vigueur dans le règlement de circulation, publiées comme texte juridique, sans positions utilisables",
    "jeux de données publics listant les places payantes individuelles : l'inventaire que la Ville détient en privé",
  ],
  explorer: {
    kicker: "Explorateur",
    title: "Chaque jeu de données qui décrit le stationnement sur rue, et ce qui a pu être joint.",
    body: "Le catalogue a été interrogé avec 51 requêtes le 20 octobre 2026. 371 jeux de données correspondaient à un mot-clé; les 34 ci-dessous décrivent le stationnement sur rue lui-même. Filtrez selon la question à laquelle un jeu répond : qui peut stationner, où, quand, à quel prix, ce qui bloque la place, comment le stationnement est utilisé, comment il est contrôlé.",
    search: "Rechercher un jeu, p. ex. neige, permis, green p…",
    allAttrs: "Toutes les questions",
    attrs: { who: "Qui peut stationner", where: "Où", when: "Quand", price: "À quel prix", blocks: "Ce qui la bloque", use: "Comment elle est utilisée", enforcement: "Contrôle" },
    joinedOnly: "Joints au jeu de données",
    notJoinedOnly: "Non joints",
    allJoin: "Tous les états",
    colTitle: "Jeu de données",
    colUpdated: "Mis à jour",
    colRefresh: "Actualisation",
    colFormats: "Formats",
    colGeometry: "Géométrie",
    colStatus: "État de jointure",
    joinedWord: "Joint",
    notJoinedWord: "Non joint",
    streetTitle: "Consulter une rue dans le jeu joint",
    streetBody: "Chaque profil de rue agrège ses segments : combien portent une infrastructure cyclable, combien se trouvent dans une zone de permis, combien de règles du règlement nomment la rue, et combien de contraventions y ont été émises de 2023 à 2025.",
    streetSearch: "Tapez une rue, p. ex. Queen St W, Yonge, Danforth…",
    colStreet: "Rue",
    colSegments: "Segments",
    colLength: "Longueur",
    colBike: "Avec infra vélo",
    colPermit: "En zone permis",
    colRules: "Règles",
    colTickets: "Contraventions 2023-25",
    noResult: "Aucun résultat. Essayez un mot-clé de jeu de données ou un nom de rue.",
  },
  showcase: {
    kicker: "Les jointures",
    title: "Ce qui a été joint, ce qui ne l'a pas été, et le taux de chacun.",
    body: "Une ligne du jeu joint est un segment de rue du fichier Centreline. Les couches spatiales se sont jointes sur la géométrie. Le règlement et les contraventions n'ont aucune géométrie, alors ils se sont joints sur le nom de rue, la clé la plus fine qu'ils offrent. Chaque taux ci-dessous est calculé à partir de la jointure elle-même.",
    colJoin: "Jointure",
    colMethod: "Clé",
    colMatched: "Appariés",
    colRate: "Taux",
    topStreets: "Les rues les plus verbalisées et leur profil de stationnement sur rue",
    topStreetsBody: "Les comptes de contraventions sont les totaux 2023-2025 de la tranche. Les règles sont le nombre de règles de stationnement sur rue en vigueur du chapitre 950 qui nomment la rue.",
  },
  gaps: {
    kicker: "Le rapport des manques",
    title: "Ce que la Ville sait du stationnement sur rue que vous ne pouvez pas télécharger.",
    body: "Un manque n'est listé que si une recherche l'appuie. Chaque entrée indique ce qui a été cherché, ce que le catalogue a retourné à la place, et où les données manquantes sont connues pour exister. Types : manquant (aucun jeu de données), texte seulement (publié comme texte juridique sans positions utilisables), périmé (publié une fois, non maintenu), partiel (publié pour une partie des rues seulement).",
    kindLabels: { missing: "Manquant", "text-only": "Texte seulement", stale: "Périmé", partial: "Partiel" },
  },
  developers: {
    kicker: "Pour les développeurs",
    title: "Interrogez-les depuis du code, ou depuis un agent.",
    body: "Trois façons de consommer les mêmes données canoniques. REST pour les applications, OpenAPI pour l'intégration, outils MCP en HTTP continu pour les agents IA.",
    endpoints: "Points de terminaison",
    tryIt: "Essayer",
    openapi: "Spécification OpenAPI",
  },
  downloads: {
    kicker: "Données",
    title: "Prenez les fichiers.",
    body: "Le jeu joint, l'inventaire, les règles du règlement aplaties et le dictionnaire de données. Licence MIT. Les jeux sources restent ceux de la Ville, sous la licence de gouvernement ouvert de Toronto.",
    download: "Télécharger",
  },
  methodology: {
    kicker: "Méthodologie",
    title: "Comment l'inventaire et les jointures ont été construits.",
    points: [
      "Inventaire : le catalogue a été interrogé via l'API CKAN (package_search) avec 51 requêtes couvrant stationnement, neige, chargement, permis, vélo, panneaux, places, parcomètres et géométrie des rues. 371 jeux de données correspondaient à un mot-clé. Un jeu entre dans l'inventaire quand ses enregistrements décrivent le stationnement sur rue : qui peut stationner, s'arrêter ou charger, où, quand, à quel prix, ce qui bloque une place, ou comment le stationnement sur rue est utilisé ou contrôlé. Les autres mentions passent en passant (une rue dans une adresse, le stationnement dans un sondage).",
      "Colonne vertébrale : Toronto Centreline, 64 392 entités, filtrées à 50 027 segments routiers. Sentiers, voies ferrées, rivières et passages ont été retirés car ils n'ont pas de stationnement sur rue. La géométrie des segments est la seule géométrie que le jeu joint affirme comme sienne.",
      "Les jointures spatiales ont été calculées en EPSG:2952 (MTM zone 10). L'infrastructure cyclable s'est jointe quand une ligne cyclable tombe à moins de 25 mètres d'un segment et porte le même nom de rue. Le stationnement sur permis s'est joint en testant le point milieu de chaque segment contre les 97 polygones de zones de permis. Les installations se sont jointes comme comptes à moins de 250 mètres du point milieu d'un segment, plus la distance au parc Green P le plus proche.",
      "Les annexes du règlement et les contraventions n'ont aucune géométrie, alors ils se sont joints sur les noms de rue normalisés. Les comptes de règles et de contraventions s'attachent donc au niveau de la rue : chaque segment d'une rue porte les comptes de la rue. La normalisation développe les types de rue (Street vers ST, Avenue vers AVE), retire les marques de district comme « (TO) », et replie les directions (West vers W).",
      "Règles en vigueur : sur 77 940 enregistrements du règlement, 13 914 portent une dernière action « Repealed » et ont été retirés. 46 455 portent un état de dernière action vide et ont été gardés comme en vigueur. Vide n'est pas une preuve qu'une règle est en vigueur; c'est l'absence d'un enregistrement d'abrogation. L'ensemble gardé compte 27 768 règles en 18 catégories de stationnement sur rue.",
      "Green P s'est joint à l'occupation des stationnements par numéro de parc (id Green P 52 vers occupation CP52), en gardant le trimestre le plus récent. Le fichier Green P est un instantané de 2019 que le catalogue marque « Will not be Refreshed »; l'occupation va jusqu'au dernier trimestre publié. Quand les deux fichiers divergent sur la capacité, les deux valeurs sont gardées dans le fichier des installations.",
      "Ce que le jeu joint ne peut pas faire : placer une règle sur un segment précis (le règlement donne la rue, le côté et un étendue en texte), dire si une place est libre (aucune occupation sur rue n'existe), ou tarifer une place précise (les tarifs existent par installation Green P, en texte). Ces limites sont le rapport des manques, pas des défauts de la jointure.",
    ],
  },
  footer: {
    line: "Un projet civique à code source ouvert par Nshipyard. Sans affiliation avec le gouvernement du Canada ni la Ville de Toronto.",
    sources: "Sources : Données ouvertes de la Ville de Toronto (catalogue CKAN, interrogé le 2026-10-20); rapport du budget de fonctionnement 2026 de la Toronto Parking Authority; étude de cas SenSen, « Digitising the Streets of Toronto: AI-powered Curb Mapping » (sensen.ai). Tranche de contraventions : le projet toronto-parking-tickets-geocoded (contraventions de stationnement de Toronto, 2023-2025).",
  },
  mcp: {
    kicker: "Connectez votre agent",
    title: "Exploitez ces données dans vos outils d'IA.",
    body: "Choisissez votre plateforme, copiez l'invite, envoyez-la à votre agent. Votre agent exécute la configuration lui-même.",
    tabs: { chatgpt: "ChatGPT", claude: "Claude", claudecode: "Claude Code", cli: "CLI", other: "Autre" },
    cardTitle: "Copiez et envoyez ceci à {tab}",
    copy: "Copier",
    copied: "Copié",
    chatgptNote: "ChatGPT se connecte via l'API REST documentée plutôt que directement en MCP.",
    pChatgpt:
      "Je veux utiliser {displayName} via son API.\n- Spécification OpenAPI : {origin}/api/openapi.json\n- Base REST : {origin}/api/v1\nD'abord, dis-moi en deux phrases ce que cette API offre, puis {exampleLower}, et montre-moi le résultat.",
    pClaude:
      "Dans Claude (claude.ai), ouvre les paramètres, puis Connecteurs, et ajoute un connecteur personnalisé :\n- Nom : {displayName}\n- URL : {origin}/mcp\nEnsuite, liste les outils disponibles, {exampleLower}, et montre-moi le résultat.",
    pClaudeCode:
      "Configure le serveur MCP {displayName} pour que je puisse l'interroger d'ici.\n1. Exécute : claude mcp add --transport http {slug} {origin}/mcp\n2. Exécute `claude mcp list` pour confirmer la connexion.\n3. {example}, et montre-moi le résultat.",
    pCli:
      "# Point de terminaison MCP (HTTP continu)\n{origin}/mcp\n\n# Lister les outils disponibles\ncurl -s -X POST {origin}/mcp -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'",
    otherTitle: "Tout le reste",
    otherBody: "Toute plateforme qui parle MCP en HTTP continu, ou REST tout court.",
    mcpEndpoint: "Point de terminaison MCP",
    openapiSpec: "Spécification OpenAPI",
    restBase: "Base REST",
  },
};

export type Dict = typeof en;

const dicts: Record<Lang, Dict> = { en, fr };

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Dict }>({
  lang: "en",
  setLang: () => {},
  t: en,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <LangCtx.Provider value={{ lang, setLang, t: dicts[lang] }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}
