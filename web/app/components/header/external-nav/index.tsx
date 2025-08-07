'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import {
  RiExternalLinkFill,
  RiExternalLinkLine,
} from '@remixicon/react'
import classNames from '@/utils/classnames'
type ExternalNavProps = {
  className?: string
}

const ExternalNav = ({
  className,
}: ExternalNavProps) => {
  const { t } = useTranslation()
  const selectedSegment = useSelectedLayoutSegment()
  const activated = selectedSegment === 'external'

  return (
    <Link href="/external" className={classNames(
      className, 'group',
      activated && 'bg-components-main-nav-nav-button-bg-active shadow-md',
      activated ? 'text-components-main-nav-nav-button-text-active' : 'text-components-main-nav-nav-button-text hover:bg-components-main-nav-nav-button-bg-hover',
    )}>
      {
        activated
          ? <RiExternalLinkFill className='mr-2 h-4 w-4' />
          : <RiExternalLinkLine className='mr-2 h-4 w-4' />
      }
      {t('common.menus.external')}
    </Link>
  )
}

export default ExternalNav 