import { apiRequest } from '../../services/api.js'

export async function getMonitoringOverview() {
  const response = await apiRequest('/admin/monitoring/overview', {
    method: 'GET',
  })

  return response.data
}
