const deepfreeze = require("deepfreeze");
const getDomainRegex = require("domain-regex");
const objectValues = require("object-values");

const AccountType = deepfreeze({
    DIRECT: "DIRECT",
    RESELLER: "RESELLER"
});

const DEFAULT_OPTIONS = {
    invalidLineAction: "filter", // filter/throw
    newLine: "\n"
};
const EMPTY_LINE = /^\s*$/;
const LINE_COMMENT = /#.+$/;
const VARIABLE_DEFINITION = /^([a-zA-Z]+)=(.+)$/;

function createDataField(line) {
    const commentStrippedLine = line.replace(LINE_COMMENT, "");
    const [domain, publisherAccountID, accountType, certificateAuthorityID] = commentStrippedLine
        .split(",")
        .map(item => decodeURIComponent(item.trim()));
    return {
        domain,
        publisherAccountID,
        accountType,
        certificateAuthorityID
    };
}

function isComment(line) {
    return /^\s*#/.test(line);
}

function isDataField(line) {
    const commentStrippedLine = line.replace(LINE_COMMENT, "");
    const domainExp = getDomainRegex();
    try {
        const [domain,, accountType] = commentStrippedLine.split(",").map(item => item.trim());
        return [
            domainExp.test(domain),
            isValidAccountType(accountType)
        ].every(result => result);
    } catch (err) {
        // silently fail
        return false;
    }
}

function isValidAccountType(type) {
    return objectValues(AccountType).indexOf(type) >= 0;
}

function isVariableAssignment(line) {
    return VARIABLE_DEFINITION.test(line);
}

function parseAdsTxt(text, parseOptions = {}) {
    const options = Object.assign({}, DEFAULT_OPTIONS, parseOptions);
    const { invalidLineAction, newLine } = options;
    if (["filter", "throw"].includes(invalidLineAction) !== true) {
        throw new Error(`Invalid option value for 'invalidLineAction' (must be 'filter' or 'throw'): ${invalidLineAction}`);
    }
    const lines = text.split(newLine);
    const dataFields = [];
    const variables = {};
    lines.forEach(line => {
        if (isComment(line) || EMPTY_LINE.test(line)) {
            return;
        }
        if (isVariableAssignment(line)) {
            const [, variableName, value] = line.match(VARIABLE_DEFINITION);
            if (typeof variables[variableName] === "string") {
                variables[variableName] = [
                    variables[variableName],
                    decodeURIComponent(value)
                ];
            } else if (Array.isArray(variables[variableName])) {
                variables[variableName].push(decodeURIComponent(value));
            } else {
                variables[variableName] = decodeURIComponent(value);
            }
        } else if (isDataField(line)) {
            dataFields.push(createDataField(line));
        } else {
            if (invalidLineAction === "throw") {
                throw new Error(`Failed parsing ads.txt: Invalid line: "${line}"`);
            }
        }
    });
    return {
        variables,
        fields: dataFields
    };
}

module.exports = {
    AccountType,
    parseAdsTxt
};
