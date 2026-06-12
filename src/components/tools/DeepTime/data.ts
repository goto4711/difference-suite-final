export const MAX_TOKENS = 22;
export const T_MAX = 1000;
export const CANVAS_SIZE = 320;
export const MA_SEED = 42;
export const MA_INPUT = 8;
export const MA_SEQ_LEN = 50;

export const EXAMPLES = [
  "The archive holds what the present forgets. Memory is not neutral. Whose history survives depends on who built the walls.",
  "Oral histories dissolve at the edges. What the elder remembers and what the document records are never the same thing.",
  "Time does not pass equally for everyone. Some decades collapse into a single footnote. Others sprawl across centuries of scholarship.",
  "Language carries its own temporality. The words we use to name the past were not the words spoken inside it.",
] as const;

export const DEFAULT_EVENTS = [
  "1950 — oral tradition",
  "1951 — local archive",
  "1952 — flood",
  "1953 — harvest",
  "1954 — migration",
  "1955 — school opens",
  "1956 — factory",
  "1957 — fire",
  "1958 — recovery",
  "1959 — census",
  "1960 — independence",
  "1961 — constitution",
  "1962 — drought",
  "1963 — protest",
  "1964 — broadcast",
  "1965 — library built",
  "1966 — epidemic",
  "1967 — election",
  "1968 — uprising",
  "1969 — peace accord",
  "1970 — photographs",
  "1971 — displacement",
  "1972 — land reform",
  "1973 — famine",
  "1974 — rebuilding",
  "1975 — radio tower",
  "1976 — strike",
  "1977 — museum opens",
  "1978 — border change",
  "1979 — revolution",
  "1980 — new government",
  "1981 — rationing",
  "1982 — children born",
  "1983 — demolition",
  "1984 — surveillance",
  "1985 — newspaper",
  "1986 — accident",
  "1987 — memorial",
  "1988 — market opens",
  "1989 — walls fall",
  "1990 — reunification",
  "1991 — collapse",
  "1992 — diaspora",
  "1993 — ceasefire",
  "1994 — transition",
  "1995 — internet",
  "1996 — election",
  "1997 — handover",
  "1998 — debt crisis",
  "1999 — present day",
] as const;

export const COLORS = {
  bg: "#99B2DD",
  surface: "#ffffff",
  border: "#832161",
  borderLight: "rgba(131,33,97,0.18)",
  ink: "#000100",
  ink2: "#444444",
  ink3: "#888888",
  amber: "#832161",
  amberBg: "rgba(131,33,97,0.08)",
  serif: '"Lexend", sans-serif',
  mono: '"Courier New", Courier, monospace',
  sans: '"Lexend", sans-serif',
} as const;

export const HEATMAP_COLORSCALE = [
  [0, "#ffffff"],
  [0.15, "#f0d0e0"],
  [0.4, "#c44a90"],
  [0.7, "#832161"],
  [1, "#3d0f2e"],
] as const;

export const HIDDEN_OPTIONS = [8, 16, 32, 64] as const;
export const RNN_COLOR = "#832161";
export const LSTM_COLOR = "#4B7BBE";
