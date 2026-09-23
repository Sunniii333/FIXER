import { beforeEach } from 'vitest'
import '../../app/globals.css'

beforeEach(() => {
  location.hash = ''
  delete document.documentElement.dataset.theme
})
