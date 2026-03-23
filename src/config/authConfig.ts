// University Login Configuration
// This file acts as the "Soft Gate" control.
// To allow a new university, simply add their domain to the ALLOWED_DOMAINS array.

// Broad regex for standard academic domains
// Matches: .edu, .edu.xx, .ac.xx (e.g., .ac.uk, .ac.za, .ac.jp)
export const ACADEMIC_REGEX = /(\.edu(\.[a-z]{2})?|\.ac\.[a-z]{2})$/i;

// Whitelist for universities that do NOT follow the standard regex above.
// Add domains here (e.g., 'tum.de', 'tsinghua.edu.cn').
export const ALLOWED_DOMAINS = [
    // --- Europe ---
    'tum.de',           // Technical University of Munich (Germany)
    'lmu.de',           // LMU Munich (Germany)
    'fu-berlin.de',     // Free University Berlin (Germany)
    'hu-berlin.de',     // Humboldt University (Germany)
    'rwth-aachen.de',   // RWTH Aachen (Germany)
    'uva.nl',           // University of Amsterdam (Netherlands)
    'vu.nl',            // VU Amsterdam (Netherlands)
    'tudelft.nl',       // TU Delft (Netherlands)
    'leidenuniv.nl',    // Leiden University (Netherlands)
    'ethz.ch',          // ETH Zurich (Switzerland)
    'epfl.ch',          // EPFL (Switzerland)
    'psl.eu',           // PSL Research University (France)
    'sorbonne-universite.fr', // Sorbonne (France)

    // --- Asia ---
    'tsinghua.edu.cn',  // Tsinghua University (China)
    'pku.edu.cn',       // Peking University (China)
    'fudan.edu.cn',     // Fudan University (China)
    'hku.hk',           // University of Hong Kong
    'nus.edu.sg',       // National University of Singapore
    'ntu.edu.sg',       // Nanyang Technological University (Singapore)
    'u-tokyo.ac.jp',    // University of Tokyo (Japan) - covered by regex, but explicit is fine
    'kyoto-u.ac.jp',    // Kyoto University (Japan) - covered by regex
    'snu.ac.kr',        // Seoul National University (South Korea) - covered by ac.kr regex? No, regex is ac.[a-z]
    'yonsei.ac.kr',     // Yonsei University

    // --- Africa ---
    'uct.ac.za',        // University of Cape Town (South Africa) - covered by regex
    'wits.ac.za',       // University of the Witwatersrand (South Africa) - covered by regex
    'uou.edu.ng',       // University of Uyo (Nigeria)
    'unilag.edu.ng',    // University of Lagos (Nigeria)
    'makerere.ac.ug',   // Makerere University (Uganda) - covered by regex
    'uonbi.ac.ke',      // University of Nairobi (Kenya) - covered by regex
    'aucegypt.edu',     // American University in Cairo (Egypt)

    // --- Australia & Oceania ---
    'unimelb.edu.au',   // University of Melbourne - covered by regex (.edu.au)
    'sydney.edu.au',    // University of Sydney - covered by regex
    'anu.edu.au',       // Australian National University - covered by regex
    'auckland.ac.nz',   // University of Auckland (NZ) - covered by regex

    // --- Americas (Non-standard) ---
    'unam.mx',          // UNAM (Mexico)
    'usp.br',           // University of São Paulo (Brazil)
    'utoronto.ca',      // University of Toronto (Canada) - mostly .ca
    'mcgill.ca',        // McGill (Canada)
    'ubc.ca',           // UBC (Canada)
];

export const checkDomain = (email: string): boolean => {
    if (!email || !email.includes('@')) return false;

    const domain = email.split('@')[1].toLowerCase();

    // 1. Check Whitelist (Exact Match)
    if (ALLOWED_DOMAINS.includes(domain)) return true;

    // 2. Check Regex
    if (ACADEMIC_REGEX.test(domain)) return true;

    return false;
};
