const fs = require("fs");
const path = require("path");
const { generateAdsTxt, parseAdsTxt } = require("../../source/index.js");

const invalidAdsTxt = fs.readFileSync(path.resolve(__dirname, "../resources/invalid.ads.txt"), "utf8");
const validAdsTxt = fs.readFileSync(path.resolve(__dirname, "../resources/valid.ads.txt"), "utf8");

describe("generateAdsTxt", function() {
    it("generates valid lines", function() {
        const content = generateAdsTxt({
            fields: [{
                domain: "test-site.com",
                publisherAccountID: "abcdef123",
                accountType: "DIRECT",
                certificateAuthorityID: "ffffff"
            }]
        });
        expect(content).to.contain("test-site.com, abcdef123, DIRECT, ffffff");
    });

    it("generates partial lines", function() {
        const content = generateAdsTxt({
            fields: [{
                domain: "test-site.com",
                publisherAccountID: "abcdef123",
                accountType: "DIRECT"
            }]
        });
        expect(content).to.contain("test-site.com, abcdef123, DIRECT");
    });

    it("generates lines with comments", function() {
        const content = generateAdsTxt({
            fields: [{
                domain: "test-site.com",
                publisherAccountID: "abcdef123",
                accountType: "DIRECT",
                certificateAuthorityID: "ffffff",
                comment: "Some Network"
            }]
        });
        expect(content).to.contain("test-site.com, abcdef123, DIRECT, ffffff # Some Network");
    });

    it("writes variables (single value)", function() {
        const content = generateAdsTxt({
            variables: {
                CONTACT: "John Doe"
            }
        });
        expect(content).to.contain("CONTACT=John Doe");
    });

    it("writes variables (multiple values)", function() {
        const content = generateAdsTxt({
            variables: {
                SUBDOMAIN: ["no1.test.com", "no2.test.com"]
            }
        });
        expect(content).to.match(/SUBDOMAIN=no1\.test\.com\nSUBDOMAIN=no2\.test\.com/m);
    });

    it("supports adding header comments", function() {
        const content = generateAdsTxt({
            variables: {
                CONTACT: "Name"
            }
        }, "My\nHeading");
        expect(content).to.match(/# My\n# Heading\nCONTACT=Name/m);
    });

    it("supports adding footer comments", function() {
        const content = generateAdsTxt({
            variables: {
                CONTACT: "Name"
            }
        }, null, "My\nFooter");
        expect(content).to.match(/CONTACT=Name\n# My\n# Footer/m);
    });
});

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

    it("does not throw on empty lines", function() {
        expect(() => {
            parseAdsTxt(validAdsTxt, { invalidLineAction: "throw" });
        }).to.not.throw();
    });

    it("parses lines that include all possible fields", function() {
        const { fields } = parseAdsTxt(validAdsTxt, { invalidLineAction: "filter" });
        const item = fields.find(field => field.domain === "website.org");
        expect(item).to.have.property("domain", "website.org");
        expect(item).to.have.property("publisherAccountID", "my name");
        expect(item).to.have.property("accountType", "RESELLER");
        expect(item).to.have.property("certificateAuthorityID", "fafdf38b16bf6");
    });

    it("strips comments at end of lines", function() {
        const { fields } = parseAdsTxt(validAdsTxt, { invalidLineAction: "filter" });
        const item = fields.find(field => field.domain === "my.domain.com");
        expect(item).to.be.an("object");
        expect(item).to.have.property("accountType", "DIRECT");
    });

    it("provides comments in parsed items", function() {
        const { fields } = parseAdsTxt(validAdsTxt, { invalidLineAction: "filter" });
        const item = fields.find(field => field.domain === "website.org");
        expect(item).to.have.property("comment", "this is a comment");
    });

    it("does not add comment property when none exists", function() {
        const { fields } = parseAdsTxt(validAdsTxt, { invalidLineAction: "filter" });
        const item = fields.find(field => field.domain === "example.com");
        expect(item).to.not.have.property("comment");
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

    it("supports splitting lines by both CR & CRLF", function() {
        const adsTxt = "my.domain.com, 12345, DIRECT #Test\r\nwebsite.org, my%20name,RESELLER,fafdf38b16bf6\ntest.net,555,DIRECT";
        const { fields } = parseAdsTxt(adsTxt);
        expect(fields).to.have.length(3);
    });
});
