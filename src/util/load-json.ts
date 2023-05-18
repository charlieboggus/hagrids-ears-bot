import { Logger } from '../util/logger'
import fs from 'fs'

export const loadJsonMap = (filename: string): Map<string, string> => {
    try {
        const json = JSON.parse(fs.readFileSync(filename, 'utf-8'))
        return new Map(Object.entries(json))
    }
    catch (err) {
        Logger.error(`${err}`, false)
        return new Map()
    }
}