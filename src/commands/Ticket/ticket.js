async execute(interaction, config, client) {
    try {
        const deferred = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });

        if (!deferred) return;

        if (!interaction.guild) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    errorEmbed(
                        "Erreur",
                        "Cette commande fonctionne uniquement dans un serveur."
                    )
                ]
            });
        }

        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.ManageChannels
            )
        ) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    errorEmbed(
                        "Permission refusée",
                        "Tu as besoin de `Manage Channels`."
                    )
                ]
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "dashboard") {
            return ticketConfig.execute(
                interaction,
                config,
                client
            );
        }

        if (subcommand !== "setup") return;

        let existingConfig =
            await getGuildConfig(
                client,
                interaction.guildId
            );

        if (
            existingConfig?.ticketPanelChannelId
        ) {
            return InteractionHelper.safeEditReply(
                interaction,
                {
                    embeds: [
                        errorEmbed(
                            "Système déjà installé",
                            "Un système ticket existe déjà."
                        )
                    ]
                }
            );
        }

        const panelChannel =
            interaction.options.getChannel(
                "panel_channel"
            );

        if (!panelChannel) {
            return InteractionHelper.safeEditReply(
                interaction,
                {
                    embeds: [
                        errorEmbed(
                            "Erreur",
                            "Salon invalide."
                        )
                    ]
                }
            );
        }

        const botPerms =
            panelChannel.permissionsFor(
                interaction.guild.members.me
            );

        if (
            !botPerms?.has([
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.EmbedLinks
            ])
        ) {
            return InteractionHelper.safeEditReply(
                interaction,
                {
                    embeds: [
                        errorEmbed(
                            "Permissions manquantes",
                            "Le bot ne peut pas envoyer de messages dans ce salon."
                        )
                    ]
                }
            );
        }

        const categoryChannel =
            interaction.options.getChannel(
                "category"
            );

        const closedCategoryChannel =
            interaction.options.getChannel(
                "closed_category"
            );

        const staffRole =
            interaction.options.getRole(
                "staff_role"
            );

        const panelMessage =
            interaction.options.getString(
                "panel_message"
            ) ||
            "Click below to create a ticket.";

        const buttonLabel =
            interaction.options.getString(
                "button_label"
            ) ||
            "Create Ticket";

        const maxTicketsPerUser =
            interaction.options.getInteger(
                "max_tickets_per_user"
            ) || 3;

        const dmOnClose =
            interaction.options.getBoolean(
                "dm_on_close"
            ) !== false;

        const setupEmbed = createEmbed({
            title: "🎫 Support Tickets",
            description: panelMessage,
            color: getColor("info")
        });

        const row =
            new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setCustomId(
                    "create_ticket"
                )
                .setLabel(
                    buttonLabel
                )
                .setEmoji("📩")
                .setStyle(
                    ButtonStyle.Primary
                )
            );

        await panelChannel.send({
            embeds: [setupEmbed],
            components: [row]
        });

        if (client.db) {

            // correction importante
            const currentConfig =
                existingConfig || {};

            currentConfig.ticketCategoryId =
                categoryChannel?.id || null;

            currentConfig.ticketClosedCategoryId =
                closedCategoryChannel?.id || null;

            currentConfig.ticketStaffRoleId =
                staffRole?.id || null;

            currentConfig.ticketPanelChannelId =
                panelChannel.id;

            currentConfig.ticketPanelMessage =
                panelMessage;

            currentConfig.ticketButtonLabel =
                buttonLabel;

            currentConfig.maxTicketsPerUser =
                maxTicketsPerUser;

            currentConfig.dmOnClose =
                dmOnClose;

            const {
                getGuildConfigKey
            } = await import(
                "../../utils/database.js"
            );

            await client.db.set(
                getGuildConfigKey(
                    interaction.guildId
                ),
                currentConfig
            );
        }

        return InteractionHelper.safeEditReply(
            interaction,
            {
                embeds: [
                    successEmbed(
                        "Succès",
                        `Le panel ticket a été créé dans ${panelChannel}`
                    )
                ]
            }
        );

    } catch(error){

        logger.error(
            "Ticket error:",
            error
        );

        return handleInteractionError(
            interaction,
            error
        );
    }
}
