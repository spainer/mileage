<script setup>
import { ref } from 'vue'

import { useConfirm } from 'primevue'

import Column from 'primevue/column'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'

const props = defineProps(['data', 'dialogTitle', 'deleteHeader', 'deleteMessage'])
const emit = defineEmits(['save', 'delete'])

const confirm = useConfirm()

const dialogData = ref({})
const dialogVisible = ref(false)

function editRow(row) {
    dialogData.value = { ...row }
    dialogVisible.value = true
}

function addData() {
    dialogData.value = {}
    dialogVisible.value = true
}

function saveData() {
    emit('save', dialogData.value)
    dialogVisible.value = false
}

function deleteData() {
    let header
    if (typeof props.deleteHeader === "string") {
        header = props.deleteHeader
    } else if (typeof props.deleteHeader === "function") {
        header = props.deleteHeader(dialogData.value)
    } else {
        header = "Delete Data?"
    }

    let message
    if (typeof props.deleteMessage === "string") {
        message = props.deleteMessage
    } else if (typeof props.deleteMessage === "function") {
        message = props.deleteMessage(dialogData.value)
    } else {
        message = "Do you really want to delete the current data?"
    }

    confirm.require({
        header,
        message,
        accept: () => {
            emit('delete', dialogData.value)
            dialogVisible.value = false
        }
    })
}
</script>

<template>
    <DataTable :value="props.data" stripedRows dataKey="id">
        <slot name="table"></slot>

        <Column class="w-20 text-center!">
            <template #header>
                <Button icon="pi pi-plus" variant="text" rounded @click="addData" />
            </template>
            <template #body="{ data }">
                <Button icon="pi pi-pencil" variant="text" rounded @click="editRow(data)" />
            </template>
        </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" :modal="true" :header="props.dialogTitle ?? 'Edit data'">
        <slot name="dialog" :data="dialogData"></slot>

        <template #footer>
            <Button icon="pi pi-save" label="Save" @click="saveData" />
            <Button icon="pi pi-trash" label="Delete" severity="danger" :disabled="!dialogData.id" @click="deleteData" />
        </template>
    </Dialog>
</template>
