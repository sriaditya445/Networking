/**
 * Reusable utility function to count devices by their type.
 * Normalizes different naming conventions (e.g. AccessPoint vs Access Point, switch vs L2 Switch)
 * to return counts for exactly the 8 standard categories.
 * 
 * @param {Array} devices - Array of device objects
 * @returns {Object} Counts of devices per category
 */
export function countDevicesByType(devices = []) {
  const counts = {
    'L2 Switch': 0,
    'L3 Switch': 0,
    'Core Switch': 0,
    'Router': 0,
    'Firewall': 0,
    'Access Point': 0,
    'WLC': 0,
    'Unknown': 0
  };

  devices.forEach(device => {
    if (!device) return;
    const type = device.device_type || 'Unknown';
    
    // Normalize type string
    const normalizedType = type.trim();

    if (normalizedType === 'L2 Switch') {
      counts['L2 Switch']++;
    } else if (normalizedType === 'L3 Switch') {
      counts['L3 Switch']++;
    } else if (normalizedType === 'Core Switch') {
      counts['Core Switch']++;
    } else if (normalizedType === 'Switch' || normalizedType.toLowerCase() === 'switch') {
      // Default generic switch to L2 Switch
      counts['L2 Switch']++;
    } else if (normalizedType === 'Router' || normalizedType.toLowerCase() === 'router') {
      counts['Router']++;
    } else if (normalizedType === 'Firewall' || normalizedType.toLowerCase() === 'firewall') {
      counts['Firewall']++;
    } else if (normalizedType === 'Access Point' || normalizedType === 'AccessPoint' || normalizedType.toLowerCase() === 'accesspoint') {
      counts['Access Point']++;
    } else if (normalizedType === 'WLC' || normalizedType.toLowerCase() === 'wlc') {
      counts['WLC']++;
    } else if (normalizedType === 'Nexus' || normalizedType.toLowerCase() === 'nexus') {
      // Nexus is a switch, default to Core Switch or L3 Switch. Let's count Nexus under Core Switch
      counts['Core Switch']++;
    } else {
      counts['Unknown']++;
    }
  });

  return counts;
}

/**
 * Filter devices by folder/job name
 * @param {Array} devices - All devices
 * @param {Array} jobs - All upload jobs
 * @param {String} folderName - Folder to filter by
 * @returns {Array} Filtered list of devices
 */
export function filterDevicesByFolder(devices = [], jobs = [], folderName = '') {
  if (!folderName) return devices;
  return devices.filter(d => {
    const job = jobs.find(j => (j._id || j.id) === d.upload_id);
    return job && job.folder_name === folderName;
  });
}
