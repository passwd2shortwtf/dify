'use client'
import React from 'react'
import NoData from '@/app/components/share/text-generation/no-data'

const Apps = () => {
  return (
    <div className="flex-1 h-full flex items-center justify-center min-h-[calc(100vh-64px)]">
      <NoData />
    </div>
  )
}

export default React.memo(Apps)
