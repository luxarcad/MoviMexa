// Catálogo proporcionado para el prototipo. Los identificadores 01–08 son
// internos; tiempos, distancias, frecuencias y paradas intermedias son simulados.
const catalog = [
  ["01", "León de los Aldama", "Metro Chabacano", 42, 5, 10, 17.4],
  ["02", "U.C.T.M. Atzacoalco", "Carmen Serdán", 36, 7, 12, 13.2],
  [
    "03",
    "San Felipe / León de los Aldama",
    "Central de Abasto",
    58,
    8,
    14,
    24.6,
  ],
  ["04", "Arenal 4.ª Sección", "Metro Pantitlán", 24, 4, 8, 8.7],
  ["05", "Aragón por Av. 604", "Metro Chapultepec", 52, 6, 11, 22.1],
  ["06", "Aragón", "Panteón San Isidro", 48, 9, 13, 19.8],
  ["07", "Aragón por Av. 604", "Metro Chapultepec", 52, 6, 11, 22.1],
  ["08", "Centro Comercial Santa Fe", "La Villa (Cantera)", 74, 8, 14, 31.5],
];

export const ROUTES = catalog.map(
  ([id, origin, destination, minutes, wait, frequency, distance]) => ({
    id,
    origin,
    destination,
    minutes,
    wait,
    frequency,
    distance,
    stops: [
      origin,
      "Parada demo 1",
      "Parada demo 2",
      "Parada demo 3",
      "Parada demo 4",
      destination,
    ].map((name, index) => ({
      id: `${id}-${index}`,
      name,
      progress: index / 5,
    })),
  }),
);
