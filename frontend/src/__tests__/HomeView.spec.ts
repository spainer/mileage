import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HomeView from '../views/HomeView.vue'

describe('HomeView', () => {
  it('renders the Mileage Tracker heading', async () => {
    const wrapper = mount(HomeView)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.text()).toContain('Mileage Tracker')
  })

  it('renders the welcome text', async () => {
    const wrapper = mount(HomeView)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.text()).toContain('Welcome to the mileage tracker.')
  })

  it('renders a Get Started button', async () => {
    const wrapper = mount(HomeView)
    await new Promise(resolve => setTimeout(resolve, 0))
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('Get Started')
  })

  it('has home class on root div', async () => {
    const wrapper = mount(HomeView)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.find('.home').exists()).toBe(true)
  })
})