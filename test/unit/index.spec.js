const fs = require("fs");
const path = require("path");
const { parseAdsTxt } = require("../../source/index.js");

const invalidAdsTxt = fs.readFileSync(path.resolve(__dirname, "../resources/invalid.ads.txt"), "utf8");
const validAdsTxt = fs.readFileSync(path.resolve(__dirname, "../resources/valid.ads.txt"), "utf8");

describe("parseAdsTxt", function() {

    it("parses a valid file without error", function() {
        expect(() => {
            parseAdsTxt(validAdsTxt);
        }).to.not.throw();
    });

    it("parses an invalid file without error", function() {
        expect(() => {
            parseAdsTxt(invalidAdsTxt);
        }).to.not.throw();
    });

    it("filters invalid lines", function() {
        const { fields } = parseAdsTxt(invalidAdsTxt, { invalidLineAction: "filter" });
        const wrongValue = fields.find(field => field.domain === "wrongvalue.org");
        const shortValue = fields.find(field => field.domain === "tooshort.com");
        expect(wrongValue).to.be.undefined;
        expect(shortValue).to.be.undefined;
    });

    it("parses valid lines from an invalid file", function() {
        const { fields } = parseAdsTxt(invalidAdsTxt, { invalidLineAction: "filter" });
        const aValue = fields.find(field => field.domain === "some-website.com");
        expect(aValue).to.have.property("domain", "some-website.com");
        expect(aValue).to.have.property("publisherAccountID", "123");
        expect(aValue).to.have.property("accountType", "RESELLER");
        expect(aValue).to.have.property("certificateAuthorityID").that.is.undefined;
    });

    it("parses lines that include all possible fields", function() {
        const { fields } = parseAdsTxt(validAdsTxt, { invalidLineAction: "filter" });
        const item = fields.find(field => field.domain === "website.org");
        expect(item).to.have.property("domain", "website.org");
        expect(item).to.have.property("publisherAccountID", "my name");
        expect(item).to.have.property("accountType", "RESELLER");
        expect(item).to.have.property("certificateAuthorityID", "fafdf38b16bf6");
    });

    it("parses variables", function() {
        const { variables } = parseAdsTxt(validAdsTxt, { invalidLineAction: "filter" });
        expect(variables).to.have.property("CONTACT", "Jane Doe");
        expect(variables).to.have.property("SUBDOMAIN", "mysub.domain.com");
    });

    it("places repeated variables in arrays", function() {
        const { variables } = parseAdsTxt(validAdsTxt, { invalidLineAction: "filter" });
        expect(variables).to.have.property("testvar").that.is.an("array");
        expect(variables.testvar).to.contain("value1");
        expect(variables.testvar).to.contain("value2");
        expect(variables.testvar).to.contain("value3");
    });

    it("throws on invalid lines when specified in options", function() {
        expect(() => {
            parseAdsTxt(invalidAdsTxt, { invalidLineAction: "throw" });
        }).to.throw(/Failed parsing/i);
    });

});
