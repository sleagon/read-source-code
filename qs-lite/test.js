const expect = require("chai").expect;
const { stringify, parse } = require("./index.js");

describe("Test for qs-lite", function() {
    it("check stringify", function() {
        let query = {
            a: 1,
            b: "B",
            c: null,
            d: undefined,
            e: [100, 200, 300],
            d: {}
        };
        expect(stringify(query)).to.equal("?a=1&b=B&e=100&e=200&e=300");
        expect(stringify(query, { brackets: true })).to.equal(
            "?a=1&b=B&e[]=100&e[]=200&e[]=300"
        );
    });
    it("check parse", function() {
        let query = {
            a: "1",
            b: "B",
            c: null,
            d: null,
            e: ["100", "200", "300"]
        };
        expect(parse("?a=1&b=B&c=&d=&e=100&e=200&e=300")).to.deep.equal(query);
        expect(parse("a=1&b=B&c=&d=&e[]=100&e[]=200&e[]=300")).deep.to.equal(
            query
        );
    });
});
