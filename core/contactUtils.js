const ASA_NAME_KEYS =
    new Set([
        "asa",
        "asaname",
        "applicationsecurityadministrator",
        "applicationsecurityadministratorname",
        "applicationsecurityadmin",
        "applicationsecurityadminname",
        "appsecurityadministrator",
        "appsecurityadministratorname",
        "appsecurityadmin",
        "appsecurityadminname",
        "appsecadministrator",
        "appsecadministratorname",
        "appsecadmin",
        "appsecadminname",
        "securityadministrator",
        "securityadministratorname"
    ]);

function normalizeKey(
    value
) {

    return String(
        value || ""
    )
        .toLocaleLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ""
        );
}

function textValue(
    value
) {

    if (
        typeof value === "string" ||
        typeof value === "number"
    ) {

        return String(
            value
        ).trim();
    }

    if (
        value &&
        typeof value === "object"
    ) {

        return String(
            value.name ||
            value.displayName ||
            value.fullName ||
            ""
        ).trim();
    }

    return "";
}

function findExplicitAsaName(
    node,
    visited = new Set()
) {

    if (
        !node ||
        typeof node !== "object" ||
        visited.has(node)
    ) {

        return "";
    }

    visited.add(
        node
    );

    for (
        const [key, value]
        of Object.entries(node)
    ) {

        if (
            ASA_NAME_KEYS.has(
                normalizeKey(
                    key
                )
            )
        ) {

            const name =
                textValue(
                    value
                );

            if (
                name
            ) {

                return name;
            }
        }
    }

    for (
        const value
        of Object.values(node)
    ) {

        const name =
            findExplicitAsaName(
                value,
                visited
            );

        if (
            name
        ) {

            return name;
        }
    }

    return "";
}

function collectAsaContactNames(
    node,
    names,
    visited = new Set()
) {

    if (
        !node ||
        typeof node !== "object" ||
        visited.has(node)
    ) {

        return;
    }

    visited.add(
        node
    );

    const roleType =
        node.roleType ||
        node.role ||
        {};

    const roleName =
        normalizeKey(
            roleType.name ||
            roleType.displayName ||
            node.roleName ||
            node.contactType
        );

    if (
        roleName === "asa" ||
        roleName.includes(
            "applicationsecurityadministrator"
        )
    ) {

        const users =
            Array.isArray(
                node.users
            )
                ? node.users
                : node.user
                    ? [node.user]
                    : [];

        users
            .map(
                textValue
            )
            .filter(Boolean)
            .forEach(
                name =>
                    names.add(
                        name
                    )
            );
    }

    Object.values(node)
        .forEach(
            value =>
                collectAsaContactNames(
                    value,
                    names,
                    visited
                )
        );
}

export function getAsaName(
    assessment,
    contacts = []
) {

    const explicitName =
        findExplicitAsaName(
            assessment
        );

    if (
        explicitName
    ) {

        return explicitName;
    }

    const names =
        new Set();

    collectAsaContactNames(
        contacts,
        names
    );

    return [
        ...names
    ].join(
        ", "
    );
}
