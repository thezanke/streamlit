/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { GridCell, GridCellKind } from "@glideapps/glide-data-grid"

import {
  getErrorCell,
  isErrorCell,
  getEmptyCell,
  getTextCell,
  toSafeArray,
  toSafeString,
  toSafeNumber,
  formatNumber,
  mergeColumnParameters,
  isMissingValueCell,
  BaseColumnProps,
  toGlideColumn,
  isValidDate,
  isDateNotNaN,
} from "./utils"
import { TextColumn } from "."

const MOCK_TEXT_COLUMN_PROPS = {
  id: "column_1",
  title: "column_1",
  indexNumber: 0,
  arrowType: {
    pandas_type: "unicode",
    numpy_type: "object",
  },
  isEditable: false,
  isHidden: false,
  isIndex: false,
  isStretched: false,
} as BaseColumnProps

describe("getErrorCell", () => {
  it("creates a valid error cell", () => {
    const errorCell = getErrorCell("Foo Error", "Lorem Ipsum Dolor")
    expect(errorCell.kind).toEqual(GridCellKind.Text)
    expect(errorCell.readonly).toEqual(true)
    expect(errorCell.allowOverlay).toEqual(true)
    expect(errorCell.displayData).toEqual("⚠️ Foo Error")
    expect(errorCell.data).toEqual("⚠️ Foo Error\n\nLorem Ipsum Dolor\n")
    expect(errorCell.isError).toEqual(true)
  })
})

describe("isErrorCell", () => {
  it("detects error cells", () => {
    const errorCell = getErrorCell("Foo Error")
    expect(isErrorCell(errorCell)).toEqual(true)

    const textCell: GridCell = {
      kind: GridCellKind.Text,
      displayData: "foo",
      data: "foo",
      allowOverlay: true,
    }
    expect(isErrorCell(textCell)).toEqual(false)
  })
})

describe("getEmptyCell", () => {
  it("creates a valid empty cell", () => {
    const emptyCell = getEmptyCell()
    expect(emptyCell.kind).toEqual(GridCellKind.Loading)
    expect(emptyCell.allowOverlay).toEqual(false)
  })
})

describe("getTextCell", () => {
  it("creates a valid read-only text cell", () => {
    const textCell = getTextCell(true, false)
    expect(textCell.kind).toEqual(GridCellKind.Text)
    expect(textCell.readonly).toEqual(true)
    expect(textCell.allowOverlay).toEqual(true)
    expect(textCell.displayData).toEqual("")
    expect(textCell.data).toEqual("")
  })
})

describe("toSafeArray", () => {
  it.each([
    [null, []],
    [undefined, []],
    ["", []],
    ["foo", ["foo"]],
    // Comma separated syntax
    ["foo,bar", ["foo", "bar"]],
    ["foo,bar,", ["foo", "bar", ""]],
    ["foo,bar,,", ["foo", "bar", "", ""]],
    // JSON Array syntax
    [`["foo","bar"]`, ["foo", "bar"]],
    // non-string values
    [0, [0]],
    [1, [1]],
    [
      [0, 1.2],
      [0, 1.2],
    ],
    [true, [true]],
    [false, [false]],
    [
      [true, false],
      [true, false],
    ],
  ])("converts %p to a valid array: %p", (input, expected) => {
    expect(toSafeArray(input)).toEqual(expected)
  })
})

describe("toSafeString", () => {
  it.each([
    [null, ""],
    [undefined, ""],
    [[], ""],
    ["", ""],
    ["foo", "foo"],
    ["abc def 1234 $", "abc def 1234 $"],
    [0, "0"],
    [1, "1"],
    [0.123, "0.123"],
    [true, "true"],
    [false, "false"],
    [["foo", "bar"], "foo,bar"],
    [[1, 2, 0.1231], "1,2,0.1231"],
    [
      {
        foo: "bar",
      },
      "[object Object]",
    ],
  ])("converts %p to a valid string: %p", (input, expected) => {
    expect(toSafeString(input)).toEqual(expected)
  })
})

describe("toSafeNumber", () => {
  it.each([
    [null, null],
    [undefined, null],
    ["", null],
    ["foo", NaN],
    [["foo"], NaN],
    [
      {
        foo: "bar",
      },
      NaN,
    ],
    [[], NaN],
    ["123", 123],
    ["123 ", 123],
    [" 123 ", 123],
    [" 123", 123],
    ["123.456", 123.456],
    ["123,456", 123456],
    ["123,456.789", 123456.789],
    ["123,456,789", 123456789],
    ["123,456,789.123", 123456789.123],
    ["4.12", 4.12],
    ["-4.12", -4.12],
    [1.3122, 1.3122],
    [123, 123],
    ["1,212.12", 1212.12],
    [".1312314", 0.1312314],
    [true, 1],
    [false, 0],
  ])("converts %p to a valid number: %p", (input, expected) => {
    expect(toSafeNumber(input)).toEqual(expected)
  })
})

describe("formatNumber", () => {
  it.each([
    [10, 0, "10"],
    [10.123, 0, "10"],
    [10.123, 1, "10.1"],
    [10.123, 2, "10.12"],
    [10.123, 3, "10.123"],
    [10.123, 4, "10.123"],
    [10.123, 5, "10.123"],
    [0.123, 0, "0"],
    [0.123, 1, "0.1"],
  ])("formats %p to %p with %p decimals", (value, decimals, expected) => {
    expect(formatNumber(value, decimals)).toEqual(expected)
  })
})

describe("mergeColumnParameters", () => {
  it("should merge the default and user parameters", () => {
    const defaultParams = {
      foo: "bar",
      bar: "baz",
    }
    const userParams = {
      foo: "baz",
      baz: "qux",
    }
    const mergedParams = mergeColumnParameters(defaultParams, userParams)
    expect(mergedParams).toEqual({
      foo: "baz",
      bar: "baz",
      baz: "qux",
    })
  })
})

describe("isMissingValueCell", () => {
  it("detects if a cell has a missing value", () => {
    const textColumn = TextColumn(MOCK_TEXT_COLUMN_PROPS)

    expect(isMissingValueCell(textColumn.getCell(null))).toBe(true)
    expect(isMissingValueCell(textColumn.getCell("foo"))).toBe(false)
  })
})

describe("toGlideColumn", () => {
  it("should convert form our BaseColumn to a glide-data-grid compatible column", () => {
    const textColumn = TextColumn(MOCK_TEXT_COLUMN_PROPS)
    const glideColumn = toGlideColumn(textColumn)

    expect(glideColumn).toEqual({
      id: MOCK_TEXT_COLUMN_PROPS.id,
      title: MOCK_TEXT_COLUMN_PROPS.title,
      hasMenu: false,
      themeOverride: MOCK_TEXT_COLUMN_PROPS.themeOverride,
      grow: undefined,
      width: undefined,
    })
  })

  it("should set the correct grow based on the isStretched config", () => {
    const textColumn = TextColumn({
      ...MOCK_TEXT_COLUMN_PROPS,
      isStretched: true,
    })

    expect(toGlideColumn(textColumn).grow).toEqual(3)

    // Create index column:
    const indexColumn = TextColumn({
      ...MOCK_TEXT_COLUMN_PROPS,
      isStretched: true,
      isIndex: true,
    })

    expect(toGlideColumn(indexColumn).grow).toEqual(1)
  })
})

describe("isValidDate", () => {
  it.each([
    [1000, true],
    [-1, true],
    [1.0, true],
    [-1.0, true],
    [new Date(), true],

    // iso date string examples
    // YYYY-MM-DD
    ["2023-01-26", true],
    // YYYY-MM-DD THH:mm:ss.sss
    ["2023-01-26T00:15:11+00:00", true],
    ["2023-01-26 00:15:11.000", true],
    ["2023-01-26 00:15:11.000Z", true],

    // YYYY-MM-DD THH:mm:ss
    ["2023-01-26T00:15:11Z", true],
    ["2011-10-10T14:48:00", true],

    ["01 Jan 1970 00:00:00 GMT", true],

    // format of str(datetime.datetime.now())
    ["2023-01-26 00:15:11", true],

    // invalid dates
    ["invalid string", false],
    ["20230126T001511Z", false],
    ["2023-01-26 00:15:11 00:00", false],
    ["11-11-invalid_date", false],
  ])(
    "check %p is a valid date: expected(%p)",
    (input: any, expected: boolean) => {
      expect(isValidDate(input)).toBe(expected)
    }
  )
})

describe("isDateNotNaN", () => {
  it.each([
    [new Date(Number.NaN), false],
    [new Date(), true],
  ])("check %p is not NaN: %p", (input: Date, expected: boolean) => {
    expect(isDateNotNaN(input)).toBe(expected)
  })
})