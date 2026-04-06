export const UPLOAD_CONFIG = {
  lidar: {
    point_cloud: {
      formats: ['.las', '.laz', '.ply', '.pcd', '.xyz'],
      maxSizeMB: 500,
    },
    wind_field: {
      formats: ['.nc', '.hdf5', '.csv', '.json'],
      maxSizeMB: 100,
    },
    boundary_layer: {
      formats: ['.nc', '.csv', '.json'],
      maxSizeMB: 50,
    },
  },
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
