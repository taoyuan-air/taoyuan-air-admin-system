export const UPLOAD_CONFIG = {
  uav: {
    sensor: {
      formats: ['.csv', '.json', '.xml', '.txt'],
      maxSizeMB: 100,
    },
    flight_path: {
      formats: ['.kml', '.gpx', '.csv', '.json'],
      maxSizeMB: 10,
    },
    imagery: {
      formats: ['.jpg', '.jpeg', '.png', '.tiff', '.raw'],
      maxSizeMB: 200,
    },
    meteorological: {
      formats: ['.csv', '.json', '.nc'],
      maxSizeMB: 50,
    },
  },
} as const;
