import { config } from '@vue/test-utils'
import { h, defineComponent } from 'vue'

const NuxtUiComponents = {
  UApp: defineComponent({
    name: 'UApp',
    render() {
      return h('div', { id: 'nuxt-app' }, this.$slots.default?.())
       },
     }),
  UContainer: defineComponent({
    name: 'UContainer',
    props: ['as'],
    render() {
      return h((this.as || 'div') as string, { class: 'u-container' }, this.$slots.default?.())
          }
        ,
         }),
  UButton: defineComponent({
    name: 'UButton',
    props: { label: String },
    render() {
      return h('button', { type: 'button', class: 'nuxt-ui-button' }, [this.label])
          }
        ,
         }),
       }

Object.entries(NuxtUiComponents).forEach(([name, component]) => {
  config.global.components[name] = component
})
