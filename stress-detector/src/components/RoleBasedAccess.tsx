import type { ReactNode } from 'react'
import { useUser } from '../contexts/UserContext'

type Props = {
  require?: Partial<{
    canChangeInterval: boolean
    canViewPatientList: boolean
    canUseCamera: boolean
    showTipsPanel: boolean
  }>
  fallback?: ReactNode
  children: ReactNode
}

export function RoleBasedAccess({ require, fallback = null, children }: Props) {
  const { permissions } = useUser()

  if (require) {
    if (require.canChangeInterval && !permissions.canChangeInterval) {
      return <>{fallback}</>
    }
    if (require.canViewPatientList && !permissions.canViewPatientList) {
      return <>{fallback}</>
    }
    if (require.canUseCamera && !permissions.canUseCamera) {
      return <>{fallback}</>
    }
    if (require.showTipsPanel && !permissions.showTipsPanel) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

